/**
 * Central tenancy helpers (SRS section 9) — every clinic-scoped query must
 * go through one of these so no route can accidentally forget the clinicId
 * filter and leak another tenant's data. Owner-wide queries bypass these and
 * are only reachable through the explicitly-marked owner admin routes.
 */
export const tenantOf = (req) => ({ clinicId: req.user.clinicId });

export const tenanted = {
  create: (Model, req, doc, options) =>
    Model.create({ ...doc, clinicId: req.user.clinicId }, options),

  find: (Model, req, conditions = {}, projection = null, options = {}) =>
    Model.find({ clinicId: req.user.clinicId, ...conditions }, projection, options),
};

export function ownedBy(Model, req, id) {
  return Model.findOne({
    _id: id,
    clinicId: req.user.clinicId,
  });
}