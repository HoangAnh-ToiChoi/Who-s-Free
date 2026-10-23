import { invitationStore } from "./group-invitation.store.js";
import {
  findById,
  findByTokenHash,
  findPendingByGroupId,
  findActiveByGroupAndEmail,
} from "./group-invitation-query.model.js";
import {
  create,
  updateStatus,
  revokeActiveByGroupAndEmail,
  deleteInvitation,
  acceptWithMember,
  clear,
} from "./group-invitation-mutation.model.js";

class GroupInvitationModel {
  static get store() { return invitationStore; }

  static create = create;
  static findById = findById;
  static findByTokenHash = findByTokenHash;
  static findPendingByGroupId = findPendingByGroupId;
  static findActiveByGroupAndEmail = findActiveByGroupAndEmail;
  static updateStatus = updateStatus;
  static revokeActiveByGroupAndEmail = revokeActiveByGroupAndEmail;
  static delete = deleteInvitation;
  static acceptWithMember = acceptWithMember;
  static clear = clear;
}

export default GroupInvitationModel;
