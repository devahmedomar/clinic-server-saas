/**
 * End-to-end smoke test for the API against an ephemeral in-memory MongoDB.
 * Run: npm run smoke
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({
  instance: { launchTimeout: 60000 },
});
process.env.MONGO_URI = mongod.getUri('clinics-saas');
process.env.JWT_SECRET = 'test-secret';

const { connectDb } = await import('../src/config/db.js');
const { app } = await import('../src/index.js');

let pass = 0;
let fail = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ok   ${name} ${extra}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

let base = '';
let server;

const req = async (method, path, { token, body, status } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (status) check(`${method} ${path} → ${status}`, res.status === status, `(got ${res.status})`);
  return { status: res.status, body: json };
};

try {
  await connectDb();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}/api`;

  console.log('\n[1] Auth & onboarding');
  let r = await req('POST', '/auth/signup', {
    body: { clinicName: 'Al-Nour Dental', name: 'Dr Omar', email: 'omar@test.com', password: 'secret123', phone: '010123' },
    status: 201,
  });
  const adminToken = r.body.token;
  const clinicUser = r.body.user;

  r = await req('POST', '/auth/login', { body: { email: 'omar@test.com', password: 'secret123' }, status: 200 });
  check('login returns token', !!r.body.token);
  check('login returns role clinicAdmin', r.body.user.role === 'clinicAdmin');

  r = await req('POST', '/auth/login', { body: { email: 'omar@test.com', password: 'wrong' }, status: 401 });
  check('wrong password rejected', r.status === 401);

  r = await req('GET', '/auth/me', { token: adminToken, status: 200 });
  check('me returns clinic status trial', r.body.clinic?.subscriptionStatus === 'trial');

  // doctor invite + accept
  r = await req('POST', '/auth/invite', {
    token: adminToken,
    body: { name: 'Dr Sara', email: 'sara@test.com', role: 'doctor' },
    status: 201,
  });
  const inviteToken = r.body.inviteToken;
  r = await req('POST', '/auth/accept-invite', { body: { token: inviteToken, password: 'sara1234' }, status: 200 });
  const doctorToken = r.body.token;
  check('invited doctor accepted', !!doctorToken && r.body.user.role === 'doctor');

  console.log('\n[2] Tenancy isolation');
  r = await req('POST', '/auth/signup', {
    body: { clinicName: 'Second Clinic', name: 'X', email: 'x@test.com', password: 'secret123' },
    status: 201,
  });
  const otherToken = r.body.token;
  r = await req('GET', '/patients', { token: otherToken, status: 200 });
  check('new clinic sees zero patients', r.body.patients.length === 0);

  console.log('\n[3] Patients');
  r = await req('POST', '/patients', {
    token: adminToken,
    body: { name: 'Ahmed Hassan', phone: '0111234567', tags: ['implant', 'checkup'] },
    status: 201,
  });
  const patientId = r.body.patient.id;
  r = await req('GET', '/patients?q=Ahmed', { token: adminToken, status: 200 });
  check('search by name works', r.body.patients.length === 1);
  r = await req('PUT', `/patients/${patientId}`, { token: adminToken, body: { phone: '0119999999' }, status: 200 });
  check('edit patient', r.body.patient.phone === '0119999999');
  r = await req('GET', '/patients', { token: otherToken, status: 200 });
  check('clinic B cannot see clinic A patient', r.body.patients.length === 0);

  console.log('\n[4] Appointments');
  const doctorId = (await req('GET', '/staff/doctors', { token: adminToken, status: 200 })).body.doctors[0].id;
  const day = '2026-09-25';
  r = await req('POST', '/appointments', {
    token: adminToken,
    body: { patientId, doctorId, date: day, startsAt: '10:00' },
    status: 201,
  });
  const apptId = r.body.appointment.id;
  r = await req('POST', '/appointments', {
    token: adminToken,
    body: { patientId, doctorId, date: day, startsAt: '10:00' },
    status: 409,
  });
  check('double-booking blocked (409)', r.status === 409);
  r = await req('GET', `/appointments?date=${day}`, { token: adminToken, status: 200 });
  check('day view returns appointment + patient/doctor names', r.body.appointments.length === 1 && r.body.patients.length === 1);
  r = await req('GET', `/appointments?date=${day}`, { token: doctorToken, status: 200 });
  check('doctor can read same clinic schedule', r.body.appointments.length === 1);

  console.log('\n[5] Visit notes + media');
  r = await req('POST', '/visit-notes', {
    token: doctorToken,
    body: { patientId, diagnosis: 'Gingivitis', prescription: 'Metronidazole 500mg', notes: 'Recheck in 2 weeks' },
    status: 201,
  });
  const noteId = r.body.visitNote.id;
  r = await req('POST', '/media/video', {
    token: doctorToken,
    body: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', patientId },
    status: 201,
  });
  const mediaId = r.body.media.id;
  check('youtube id extracted', r.body.media.youtubeId === 'dQw4w9WgXcQ');
  r = await req('POST', `/visit-notes/${noteId}/attach`, { token: doctorToken, body: { mediaId }, status: 200 });
  r = await req('GET', `/visit-notes?patientId=${patientId}`, { token: adminToken, status: 200 });
  check('note includes attached media', r.body.notes[0]?.media?.length === 1);
  r = await req('POST', '/media/video', {
    token: otherToken,
    body: { url: 'bad-url', patientId },
    status: 400,
  });
  check('invalid youtube url rejected', r.status === 400);

  console.log('\n[6] Instruction video library');
  r = await req('POST', '/videos', {
    token: adminToken,
    body: { title: 'After tooth extraction', url: 'https://youtu.be/abcdefghijk' },
    status: 201,
  });
  check('library video added', r.body.video.youtubeId === 'abcdefghijk');
  r = await req('POST', '/videos', {
    token: doctorToken,
    body: { title: 'x', url: 'https://youtu.be/ccccccccccc' },
    status: 201,
  });
  r = await req('GET', '/videos', { token: otherToken, status: 200 });
  check('library is tenant-scoped', r.body.videos.length === 0);

  console.log('\n[7] Subscription');
  r = await req('GET', '/subscription', { token: adminToken, status: 200 });
  check('trial status reported', r.body.status === 'trial');
  check('whatsapp confirm link present', !!r.body.whatsappConfirmLink);

  console.log('\n[8] Owner admin');
  r = await req('POST', '/auth/signup', {
    body: { clinicName: 'Owner', name: 'Owner', email: 'owner@test.com', password: 'owner123' },
    status: 201,
  });
  // owner account is a separate role — login via seed
  const { default: User } = await import('../src/models/User.js');
  const bcrypt = await import('bcryptjs').then((m) => m.default);
  await User.create({
    role: 'owner', name: 'Platform Owner', email: 'po@test.com',
    passwordHash: await bcrypt.hash('po12345', 10), status: 'active',
  });
  r = await req('POST', '/auth/login', { body: { email: 'po@test.com', password: 'po12345' }, status: 200 });
  const ownerToken = r.body.token;

  r = await req('GET', '/owner/clinics', { token: ownerToken, status: 200 });
  check('owner sees all clinics', r.body.clinics.filter((c) => c.name === 'Al-Nour Dental').length === 1);
  const clinicRow = r.body.clinics.find((c) => c.name === 'Al-Nour Dental');
  check('owner sees clinic status trial', clinicRow.status === 'trial');

  r = await req('POST', `/owner/clinics/${clinicRow.id}/confirm-payment`, { token: ownerToken, status: 200 });
  check('owner confirms payment', r.body.clinic.subscriptionStatus === 'active');

  r = await req('GET', '/subscription', { token: adminToken, status: 200 });
  check('clinic now active after payment', r.body.status === 'active');

  r = await req('GET', '/owner/mrr', { token: ownerToken, status: 200 });
  check('mrr reflects active clinic', r.body.activeClinics === 1 && r.body.mrr > 0);

  // suspending a clinic locks access
  r = await req('POST', `/owner/clinics/${clinicRow.id}/suspend`, { token: ownerToken, status: 200 });
  r = await req('GET', '/patients', { token: adminToken, status: 403 });
  check('suspended clinic fully locked (403)', r.status === 403 && r.body.code === 'SUBSCRIPTION_LOCKED');

  r = await req('POST', `/owner/clinics/${clinicRow.id}/reactivate`, { token: ownerToken, status: 200 });
  r = await req('GET', '/patients', { token: adminToken, status: 200 });
  check('reactivated clinic reads again', r.status === 200);

  // non-owner cannot hit owner routes
  r = await req('GET', '/owner/clinics', { token: adminToken, status: 403 });
  check('non-owner blocked from owner admin', r.status === 403);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed\n`);
} catch (e) {
  console.error('\nSMOKE TEST CRASHED:', e);
  fail++;
} finally {
  if (server) await new Promise((r) => server.close(r));
  await mongod.stop();
  process.exit(fail === 0 ? 0 : 1);
}