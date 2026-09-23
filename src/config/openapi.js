export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Clinics Management SaaS API',
    version: '1.0.0',
    description:
      'Multi-tenant clinics management API. Most endpoints require a Bearer token (click **Authorize** and paste the token returned by login/signup).\n\n' +
      'Roles: `owner` (platform admin), `clinicAdmin`, `doctor`, `receptionist`.',
  },
  servers: [{ url: '/api', description: 'Same-origin API base path (works in local dev and Vercel)' }],
  tags: [
    { name: 'Auth', description: 'Login, signup, invitations' },
    { name: 'Patients', description: 'Patient records (clinic-scoped)' },
    { name: 'Appointments', description: 'Calendar, booking, visit notes from appointments' },
    { name: 'Visit Notes', description: 'Clinical notes + media attachments' },
    { name: 'Media', description: 'Image upload (ImgBB) + YouTube links' },
    { name: 'Videos', description: 'Shared instructional video library' },
    { name: 'Staff', description: 'Doctors & staff lists' },
    { name: 'Subscription', description: 'Clinic-facing subscription status' },
    { name: 'Clinic', description: 'Dashboard overview counts' },
    { name: 'Owner', description: 'Platform owner admin (owner role only)' },
    { name: 'System', description: 'Health checks' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string' } } },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6ab3bd8f5c3b062fcadead05' },
          clinicId: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['owner', 'clinicAdmin', 'doctor', 'receptionist'] },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['active', 'invited'] },
          inviteToken: { type: 'string', nullable: true },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT. Paste into Authorize (without the "Bearer " prefix).' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Clinic: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          subscriptionStatus: { type: 'string', enum: ['trial', 'active', 'gracePeriod', 'locked', 'cancelled'] },
          trialEndsAt: { type: 'string', format: 'date-time' },
          nextDueDate: { type: 'string', format: 'date-time', nullable: true },
          graceEndsAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          dob: { type: 'string', format: 'date', nullable: true },
          gender: { type: 'string', enum: ['male', 'female', ''] },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          archived: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          doctorId: { type: 'string' },
          date: { type: 'string', example: '2026-09-25' },
          startsAt: { type: 'string', example: '10:00' },
          durationMin: { type: 'number' },
          status: { type: 'string', enum: ['booked', 'done', 'cancelled', 'no-show'] },
          notes: { type: 'string' },
        },
      },
      VisitNote: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          appointmentId: { type: 'string', nullable: true },
          doctorId: { type: 'string' },
          doctorName: { type: 'string', nullable: true },
          diagnosis: { type: 'string' },
          prescription: { type: 'string' },
          notes: { type: 'string' },
          media: { type: 'array', items: { $ref: '#/components/schemas/MediaItem' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      MediaItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          visitNoteId: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['image', 'video'] },
          url: { type: 'string' },
          youtubeId: { type: 'string' },
          uploaderId: { type: 'string' },
        },
      },
      InstructionVideo: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          youtubeId: { type: 'string' },
          url: { type: 'string' },
          createdBy: { type: 'string' },
        },
      },
      SubscriptionInfo: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['trial', 'active', 'gracePeriod', 'locked', 'cancelled'] },
          clinicName: { type: 'string' },
          trialEndsAt: { type: 'string', format: 'date-time', nullable: true },
          nextDueDate: { type: 'string', format: 'date-time', nullable: true },
          graceEndsAt: { type: 'string', format: 'date-time', nullable: true },
          pricePerMonth: { type: 'number' },
          currency: { type: 'string' },
          paymentInstructions: { type: 'string' },
          whatsappConfirmLink: { type: 'string' },
          canWrite: { type: 'boolean' },
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                amount: { type: 'number' },
                confirmedAt: { type: 'string', format: 'date-time', nullable: true },
                note: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      OwnerClinicRow: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          signupAt: { type: 'string', format: 'date-time' },
          trialEndsAt: { type: 'string', format: 'date-time' },
          nextDueDate: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['trial', 'active', 'gracePeriod', 'locked', 'cancelled'] },
          lastPaidAt: { type: 'string', format: 'date-time', nullable: true },
          users: { type: 'number' },
          patients: { type: 'number' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        operationId: 'health',
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, ts: { type: 'string' } } } } },
          },
        },
      },
    },

    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a clinic (creates tenant + clinic admin, starts 30-day trial)',
        operationId: 'signup',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['clinicName', 'name', 'email', 'password'],
                properties: {
                  clinicName: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Clinic created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email + password',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK — returns JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Invalid credentials / account not active', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user + clinic subscription status',
        operationId: 'me',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' }, clinic: { $ref: '#/components/schemas/Clinic' } },
                },
              },
            },
          },
          401: { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/auth/invite': {
      post: {
        tags: ['Auth'],
        summary: 'Clinic admin invites a doctor or receptionist by email',
        operationId: 'invite',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'role'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['doctor', 'receptionist'] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Invited — returns inviteToken + inviteLink',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    inviteToken: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                    inviteLink: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Unauthorized' },
          403: { description: 'Only clinicAdmin' },
          409: { description: 'Email already registered' },
        },
      },
    },

    '/auth/accept-invite': {
      post: {
        tags: ['Auth'],
        summary: 'Invited user sets their password on first login',
        operationId: 'acceptInvite',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: { token: { type: 'string' }, password: { type: 'string', minLength: 6 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK — returns JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Invalid or expired invite' },
        },
      },
    },

    '/patients': {
      get: {
        tags: ['Patients'],
        summary: 'List / search patients (name/phone)',
        operationId: 'listPatients',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', required: false, schema: { type: 'string' }, description: 'Search by name or phone (case-insensitive)' },
          { name: 'archived', in: 'query', required: false, schema: { type: 'string', enum: ['true', 'false'] }, description: 'Filter archived patients. Default false' },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { patients: { type: 'array', items: { $ref: '#/components/schemas/Patient' } } } } } } },
          401: { description: 'Unauthorized' },
          403: { description: 'Subscription locked / read-only' },
        },
      },
      post: {
        tags: ['Patients'],
        summary: 'Create a patient (clinicAdmin, doctor, receptionist)',
        operationId: 'createPatient',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  dob: { type: 'string', format: 'date' },
                  gender: { type: 'string', enum: ['male', 'female', ''] },
                  notes: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { patient: { $ref: '#/components/schemas/Patient' } } } } } },
          401: { description: 'Unauthorized' },
          403: { description: 'Subscription locked' },
        },
      },
    },

    '/patients/{id}': {
      get: {
        tags: ['Patients'],
        summary: 'Get one patient',
        operationId: 'getPatient',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { patient: { $ref: '#/components/schemas/Patient' } } } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Patients'],
        summary: 'Edit a patient (admin/doctor/receptionist)',
        operationId: 'updatePatient',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  dob: { type: 'string', format: 'date', nullable: true },
                  gender: { type: 'string', enum: ['male', 'female', ''] },
                  notes: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  archived: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { patient: { $ref: '#/components/schemas/Patient' } } } } } },
          401: { description: 'Unauthorized' },
          404: { description: 'Not found' },
        },
      },
    },

    '/appointments': {
      get: {
        tags: ['Appointments'],
        summary: 'Calendar / day view — list appointments with patient & doctor names',
        operationId: 'listAppointments',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date', in: 'query', required: false, schema: { type: 'string' }, description: 'Date YYYY-MM-DD' },
          { name: 'doctorId', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'patientId', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'from', in: 'query', required: false, schema: { type: 'string' }, description: 'Date range start YYYY-MM-DD' },
          { name: 'to', in: 'query', required: false, schema: { type: 'string' }, description: 'Date range end YYYY-MM-DD' },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    appointments: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
                    patients: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' } } } },
                    doctors: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } },
                  },
                },
              },
            },
          },
          400: { description: 'Bad date format' },
        },
      },
      post: {
        tags: ['Appointments'],
        summary: 'Create an appointment (clinicAdmin, doctor, receptionist) — double-booking blocked with 409',
        operationId: 'createAppointment',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['patientId', 'doctorId', 'date', 'startsAt'],
                properties: {
                  patientId: { type: 'string' },
                  doctorId: { type: 'string' },
                  date: { type: 'string', example: '2026-09-25' },
                  startsAt: { type: 'string', example: '10:00' },
                  durationMin: { type: 'number' },
                  status: { type: 'string', enum: ['booked', 'done', 'cancelled', 'no-show'] },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { appointment: { $ref: '#/components/schemas/Appointment' } } } } } },
          400: { description: 'Validation error' },
          404: { description: 'Patient or doctor not found' },
          409: { description: 'Doctor already booked at that time' },
        },
      },
    },

    '/appointments/{id}': {
      put: {
        tags: ['Appointments'],
        summary: 'Update appointment status / details',
        operationId: 'updateAppointment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['booked', 'done', 'cancelled', 'no-show'] },
                  notes: { type: 'string' },
                  date: { type: 'string' },
                  startsAt: { type: 'string' },
                  durationMin: { type: 'number' },
                  doctorId: { type: 'string' },
                  patientId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { appointment: { $ref: '#/components/schemas/Appointment' } } } } } },
          400: { description: 'Validation error' },
          404: { description: 'Not found' },
          409: { description: 'Doctor already booked at that time' },
        },
      },
    },

    '/appointments/{id}/visit-note': {
      post: {
        tags: ['Appointments'],
        summary: 'Create a visit note from an appointment (marks it done if booked)',
        operationId: 'appointmentVisitNote',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  diagnosis: { type: 'string' },
                  prescription: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { visitNote: { $ref: '#/components/schemas/VisitNote' } } } } } },
          404: { description: 'Appointment not found' },
        },
      },
    },

    '/visit-notes': {
      get: {
        tags: ['Visit Notes'],
        summary: 'List visit notes for a patient (timeline) with attached media',
        operationId: 'listVisitNotes',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'patientId', in: 'query', required: false, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'array', items: { $ref: '#/components/schemas/VisitNote' } } } } } } },
        },
      },
      post: {
        tags: ['Visit Notes'],
        summary: 'Create a visit note',
        operationId: 'createVisitNote',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['patientId'],
                properties: {
                  patientId: { type: 'string' },
                  appointmentId: { type: 'string' },
                  diagnosis: { type: 'string' },
                  prescription: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { visitNote: { $ref: '#/components/schemas/VisitNote' } } } } } },
          400: { description: 'Validation error' },
          404: { description: 'Patient not found' },
        },
      },
    },

    '/visit-notes/{id}': {
      put: {
        tags: ['Visit Notes'],
        summary: 'Edit a visit note (clinicAdmin or doctor)',
        operationId: 'updateVisitNote',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { diagnosis: { type: 'string' }, prescription: { type: 'string' }, notes: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { visitNote: { $ref: '#/components/schemas/VisitNote' } } } } } },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Visit Notes'],
        summary: 'Delete a visit note (clinicAdmin or doctor)',
        operationId: 'deleteVisitNote',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          404: { description: 'Not found' },
        },
      },
    },

    '/visit-notes/{id}/attach': {
      post: {
        tags: ['Visit Notes'],
        summary: 'Attach existing media (image/video) to a visit note',
        operationId: 'attachMedia',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['mediaId'], properties: { mediaId: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { media: { $ref: '#/components/schemas/MediaItem' } } } } } },
          400: { description: 'Media not found for this patient / already attached' },
          404: { description: 'Visit note not found' },
        },
      },
    },

    '/media/upload-image': {
      post: {
        tags: ['Media'],
        summary: 'Upload an image (multipart/form-data) — stored via ImgBB, URL only',
        operationId: 'uploadImage',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Image file (max 8 MB)' },
                  patientId: { type: 'string' },
                  visitNoteId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Uploaded', content: { 'application/json': { schema: { type: 'object', properties: { media: { $ref: '#/components/schemas/MediaItem' }, url: { type: 'string' }, displayUrl: { type: 'string' } } } } } },
          400: { description: 'file (image) is required or not an image' },
          503: { description: 'IMGBB_API_KEY not configured on server' },
        },
      },
    },

    '/media/video': {
      post: {
        tags: ['Media'],
        summary: 'Attach a YouTube video by link (unlisted OK)',
        operationId: 'createVideoMedia',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, patientId: { type: 'string' }, visitNoteId: { type: 'string' } } },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { media: { $ref: '#/components/schemas/MediaItem' } } } } } },
          400: { description: 'Invalid YouTube URL' },
        },
      },
    },

    '/media/patient/{patientId}': {
      get: {
        tags: ['Media'],
        summary: 'Media timeline for a patient',
        operationId: 'listPatientMedia',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { media: { type: 'array', items: { $ref: '#/components/schemas/MediaItem' } } } } } } },
        },
      },
    },

    '/media/{id}': {
      delete: {
        tags: ['Media'],
        summary: 'Delete a media item',
        operationId: 'deleteMedia',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          404: { description: 'Not found' },
        },
      },
    },

    '/videos': {
      get: {
        tags: ['Videos'],
        summary: 'List instructional video library (tenant-scoped)',
        operationId: 'listVideos',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { videos: { type: 'array', items: { $ref: '#/components/schemas/InstructionVideo' } } } } } } },
        },
      },
      post: {
        tags: ['Videos'],
        summary: 'Add a library video (clinicAdmin or doctor)',
        operationId: 'createVideo',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['title', 'url'], properties: { title: { type: 'string' }, description: { type: 'string' }, url: { type: 'string' } } },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { video: { $ref: '#/components/schemas/InstructionVideo' } } } } } },
          400: { description: 'title/url required or invalid YouTube URL' },
        },
      },
    },

    '/videos/{id}': {
      delete: {
        tags: ['Videos'],
        summary: 'Delete a library video (clinicAdmin or doctor)',
        operationId: 'deleteVideo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          404: { description: 'Not found' },
        },
      },
    },

    '/staff/doctors': {
      get: {
        tags: ['Staff'],
        summary: 'List active doctors in this clinic',
        operationId: 'listDoctors',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { doctors: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } },
        },
      },
    },

    '/staff': {
      get: {
        tags: ['Staff'],
        summary: 'List all staff (clinicAdmin only)',
        operationId: 'listStaff',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { staff: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } },
          403: { description: 'clinicAdmin only' },
        },
      },
    },

    '/subscription': {
      get: {
        tags: ['Subscription'],
        summary: 'Clinic-facing subscription status + payment screen info',
        operationId: 'getSubscription',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubscriptionInfo' } } } },
        },
      },
    },

    '/clinic/overview': {
      get: {
        tags: ['Clinic'],
        summary: 'Clinic dashboard overview counts',
        operationId: 'clinicOverview',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { counts: { type: 'object' }, today: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },

    '/owner/clinics': {
      get: {
        tags: ['Owner'],
        summary: 'List every clinic with subscription status & counts (owner only)',
        operationId: 'ownerClinics',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { clinics: { type: 'array', items: { $ref: '#/components/schemas/OwnerClinicRow' } } } } } } },
          403: { description: 'owner only' },
        },
      },
    },

    '/owner/clinics/{id}': {
      get: {
        tags: ['Owner'],
        summary: 'Clinic detail + recent events (owner only)',
        operationId: 'ownerClinicDetail',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK' },
          400: { description: 'bad id' },
          404: { description: 'Clinic not found' },
        },
      },
    },

    '/owner/clinics/{id}/confirm-payment': {
      post: {
        tags: ['Owner'],
        summary: 'Confirm a manual payment → clinic becomes active for 30 days (owner only)',
        operationId: 'confirmPayment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { clinic: { type: 'object' } } } } } },
          404: { description: 'Clinic not found' },
        },
      },
    },

    '/owner/clinics/{id}/suspend': {
      post: {
        tags: ['Owner'],
        summary: 'Suspend a clinic → locks all tenant access (owner only)',
        operationId: 'suspendClinic',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK' },
          400: { description: 'Clinic already locked/cancelled' },
          404: { description: 'Clinic not found' },
        },
      },
    },

    '/owner/clinics/{id}/reactivate': {
      post: {
        tags: ['Owner'],
        summary: 'Reactivate a suspended clinic (owner only)',
        operationId: 'reactivateClinic',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK' },
          404: { description: 'Clinic not found' },
        },
      },
    },

    '/owner/mrr': {
      get: {
        tags: ['Owner'],
        summary: 'Monthly recurring revenue (owner only)',
        operationId: 'ownerMrr',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { mrr: { type: 'number' }, activeClinics: { type: 'number' }, pricePerMonth: { type: 'number' }, currency: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },
};