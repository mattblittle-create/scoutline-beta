// lib/profileState.ts

import {
  PlayerProfile,
  ProfileState,
  OwnershipMode,
} from "@prisma/client";

/**
 * ============
 * Actor context
 * ============
 */

export type ActorContext = {
  userId: string | null;          // logged-in user id or null
  isScoutlineAdmin: boolean;      // user.role === "ADMIN" (or whatever you use)
  // Team context relative to the *owner team* (if any)
  isOwnerTeamAdmin: boolean;      // this user is TEAM_ADMIN of ownerTeamId
  isOwnerTeamCoach: boolean;      // this user is COACH of ownerTeamId
  // College / recruiting coach
  isCollegeCoach: boolean;        // e.g. user.collegeId != null && user.role === "COACH"
  // Is the actor the player/parent for this profile?
  isPlayerOrParent: boolean;      // typically profile.userId === user.id
  // Is this user on *any* team with this player (secondary team)?
  isSecondaryTeamStaff: boolean;  // coach/admin on a non-owner team that has this player on its roster
};

export type ProfilePermissions = {
  canViewBasic: boolean;
  canViewExtended: boolean;
  canEditProfileFields: boolean;
  canManageBilling: boolean;
  canCloseOrArchiveProfile: boolean;
  canChangeOwnership: boolean;
  canAddCoachNotes: boolean;
  canViewCoachNotes: boolean;
  canUseRecruitingBoard: boolean;
  canShareProfile: boolean;
};

/**
 * Compute permissions for an actor on a given PlayerProfile.
 * This encodes the matrix we designed (STATE x ROLE).
 */
export function getProfilePermissions(
  profile: PlayerProfile,
  actor: ActorContext
): ProfilePermissions {
  const {
    userId,
    isScoutlineAdmin,
    isOwnerTeamAdmin,
    isOwnerTeamCoach,
    isCollegeCoach,
    isPlayerOrParent,
    isSecondaryTeamStaff,
  } = actor;

  const isLoggedIn = !!userId;

  // Base: admins can basically do everything.
  if (isScoutlineAdmin) {
    return {
      canViewBasic: true,
      canViewExtended: true,
      canEditProfileFields: true,
      canManageBilling: true,
      canCloseOrArchiveProfile: true,
      canChangeOwnership: true,
      canAddCoachNotes: true,
      canViewCoachNotes: true,
      canUseRecruitingBoard: true,
      canShareProfile: true,
    };
  }

  // Convenience flags
  const state = profile.profileState;
  const isTeamOwnedActive = state === ProfileState.TEAM_OWNED_ACTIVE;
  const isPendingTransfer = state === ProfileState.TEAM_REMOVAL_PENDING_TRANSFER;
  const isPlayerOwnedActive = state === ProfileState.PLAYER_OWNED_ACTIVE;
  const isArchived = state === ProfileState.ARCHIVED_NO_ACTIVE_PLAN;

  // Default: super locked-down
  const base: ProfilePermissions = {
    canViewBasic: false,
    canViewExtended: false,
    canEditProfileFields: false,
    canManageBilling: false,
    canCloseOrArchiveProfile: false,
    canChangeOwnership: false,
    canAddCoachNotes: false,
    canViewCoachNotes: false,
    canUseRecruitingBoard: false,
    canShareProfile: false,
  };

  // ARCHIVED: only admins (handled above) can do stuff; everyone else: no.
  if (isArchived) {
    // Player/parent can *see* that something exists only via re-subscribe flows;
    // but they can't view/edit profile data directly.
    if (isPlayerOrParent) {
      return {
        ...base,
        // they can't see data, but can manage billing to re-activate
        canManageBilling: true,
      };
    }
    return base;
  }

  // PLAYER_OWNED_ACTIVE
  if (isPlayerOwnedActive) {
    if (isPlayerOrParent) {
      return {
        canViewBasic: true,
        canViewExtended: true,
        canEditProfileFields: true,
        canManageBilling: true,
        canCloseOrArchiveProfile: true,
        canChangeOwnership: true, // can agree to transfer to a team
        canAddCoachNotes: false,
        canViewCoachNotes: false,
        canUseRecruitingBoard: false,
        canShareProfile: true,
      };
    }

    // Owner Team staff when player is on their roster but profile is player-owned:
    if (isOwnerTeamAdmin || isOwnerTeamCoach || isSecondaryTeamStaff) {
      return {
        ...base,
        canViewBasic: true,
        canViewExtended: true, // if we allow extended while rostered
        canUseRecruitingBoard: true,
        canShareProfile: true,
      };
    }

    // College coach (free recruiter) on public/shared profiles:
    if (isCollegeCoach) {
      return {
        ...base,
        canViewBasic: true,
        // Extended data only if explicitly shared; leave false by default here.
        canAddCoachNotes: true,
        canViewCoachNotes: true,
        canUseRecruitingBoard: true,
        canShareProfile: true,
      };
    }

    // Anonymous / other logged-in users:
    return {
      ...base,
      canViewBasic: true, // public profile view
      canShareProfile: true,
    };
  }

  // TEAM_OWNED_ACTIVE
  if (isTeamOwnedActive) {
    if (isPlayerOrParent) {
      return {
        canViewBasic: true,
        canViewExtended: true,
        canEditProfileFields: true,
        canManageBilling: false, // team billing
        canCloseOrArchiveProfile: false,
        canChangeOwnership: true, // via "take back ownership" flow
        canAddCoachNotes: false,
        canViewCoachNotes: false,
        canUseRecruitingBoard: false,
        canShareProfile: true,
      };
    }

    if (isOwnerTeamAdmin) {
      return {
        canViewBasic: true,
        canViewExtended: true,
        canEditProfileFields: true,
        canManageBilling: true, // team controls team-side billing
        canCloseOrArchiveProfile: false, // they "remove" player, not delete
        canChangeOwnership: true, // initiate removal / transfer
        canAddCoachNotes: false,
        canViewCoachNotes: false,
        canUseRecruitingBoard: false, // recruiting board is college-side
        canShareProfile: true,
      };
    }

    if (isOwnerTeamCoach) {
      return {
        ...base,
        canViewBasic: true,
        canViewExtended: true,
        canUseRecruitingBoard: true,
        canShareProfile: true,
      };
    }

    if (isSecondaryTeamStaff) {
      return {
        ...base,
        canViewBasic: true,
        canViewExtended: true,
        canUseRecruitingBoard: true,
        canShareProfile: true,
      };
    }

    if (isCollegeCoach) {
      return {
        ...base,
        canViewBasic: true,
        canAddCoachNotes: true,
        canViewCoachNotes: true,
        canUseRecruitingBoard: true,
        canShareProfile: true,
      };
    }

    // Everyone else: public view only
    return {
      ...base,
      canViewBasic: true,
      canShareProfile: true,
    };
  }

  // TEAM_REMOVAL_PENDING_TRANSFER (15-day window)
  if (isPendingTransfer) {
    if (isPlayerOrParent) {
      return {
        canViewBasic: true,
        canViewExtended: true,
        canEditProfileFields: true,
        canManageBilling: true, // can start their own plan
        canCloseOrArchiveProfile: false,
        canChangeOwnership: true, // by starting their plan (become PLAYER_OWNED_ACTIVE)
        canAddCoachNotes: false,
        canViewCoachNotes: false,
        canUseRecruitingBoard: false,
        canShareProfile: true,
      };
    }

    // Owner team staff: live profile is no longer theirs; only snapshot in UI.
    if (isOwnerTeamAdmin || isOwnerTeamCoach) {
      return {
        ...base,
        // their UI will show snapshot via separate query, but permissions on *live* profile are nil.
      };
    }

    if (isCollegeCoach) {
      return {
        ...base,
        canViewBasic: true, // if still public
        canAddCoachNotes: true,
        canViewCoachNotes: true,
        canUseRecruitingBoard: true,
        canShareProfile: true,
      };
    }

    // Anonymous / others: basic public view only (if public)
    return {
      ...base,
      canViewBasic: true,
      canShareProfile: true,
    };
  }

  // Fallback (shouldn't hit, but keep types happy)
  return base;
}

/**
 * ============
 * State machine
 * ============
 *
 * We encode the allowed transitions as "events".
 * The function returns a partial update you can pass into prisma.playerProfile.update({ data: ... }).
 */

export type ProfileEvent =
  | { type: "PLAYER_BUY_PLAN" }
  | { type: "TEAM_TAKE_OWNERSHIP"; teamId: string }
  | { type: "TEAM_REMOVE_PLAYER" }
  | { type: "PLAYER_TAKE_OWNERSHIP" } // parent takes back ownership while team-owned
  | { type: "TRANSFER_WINDOW_EXPIRED" }
  | { type: "ADMIN_FORCE_ARCHIVE" }
  | { type: "CLEAR_BILLING_CONFLICT" }
  | { type: "BILLING_CONFLICT_DETECTED" };

export type PlayerProfileUpdateShape = Partial<
  Pick<
    PlayerProfile,
    | "profileState"
    | "ownershipMode"
    | "ownerTeamId"
    | "hasActiveTeamBilling"
    | "hasActivePlayerBilling"
    | "billingConflictFlag"
  >
>;

/**
 * Apply a domain event to a PlayerProfile and return the fields that should be updated.
 * This does not call Prisma directly – it just gives you a safe update "patch".
 */
export function applyProfileEvent(
  profile: PlayerProfile,
  event: ProfileEvent
): PlayerProfileUpdateShape {
  const { profileState, ownershipMode } = profile;

  switch (event.type) {
    case "PLAYER_BUY_PLAN": {
      // From scratch or from ARCHIVED -> PLAYER_OWNED_ACTIVE
      if (
        profileState === ProfileState.ARCHIVED_NO_ACTIVE_PLAN ||
        profileState === ProfileState.PLAYER_OWNED_ACTIVE
      ) {
        return {
          profileState: ProfileState.PLAYER_OWNED_ACTIVE,
          ownershipMode: OwnershipMode.PLAYER_PRIMARY,
          ownerTeamId: null,
          hasActivePlayerBilling: true,
          hasActiveTeamBilling: false,
          billingConflictFlag: false,
        };
      }
      // If this happens in other states, you might handle differently
      return {};
    }

    case "TEAM_TAKE_OWNERSHIP": {
      const { teamId } = event;
      // Player agrees to let a team own and pay (from PLAYER_OWNED_ACTIVE or "new" profile)
      if (
        profileState === ProfileState.PLAYER_OWNED_ACTIVE ||
        profileState === ProfileState.ARCHIVED_NO_ACTIVE_PLAN
      ) {
        return {
          profileState: ProfileState.TEAM_OWNED_ACTIVE,
          ownershipMode: OwnershipMode.TEAM_PRIMARY,
          ownerTeamId: teamId,
          hasActiveTeamBilling: true,
          hasActivePlayerBilling: false, // auto-pause player billing
          billingConflictFlag: false,
        };
      }
      return {};
    }

    case "TEAM_REMOVE_PLAYER": {
      // Only meaningful when team is current owner
      if (profileState === ProfileState.TEAM_OWNED_ACTIVE) {
        return {
          profileState: ProfileState.TEAM_REMOVAL_PENDING_TRANSFER,
          // team stops being billed for this player
          hasActiveTeamBilling: false,
          // player doesn't have billing yet until/if they start a plan
          hasActivePlayerBilling: false,
          // ownershipMode can remain TEAM_PRIMARY historically, but functionally
          // no one is paying during the window.
        };
      }
      return {};
    }

    case "PLAYER_TAKE_OWNERSHIP": {
      // Player/parent takes over from team at any time
      if (
        profileState === ProfileState.TEAM_OWNED_ACTIVE ||
        profileState === ProfileState.TEAM_REMOVAL_PENDING_TRANSFER
      ) {
        return {
          profileState: ProfileState.PLAYER_OWNED_ACTIVE,
          ownershipMode: OwnershipMode.PLAYER_PRIMARY,
          ownerTeamId: null,
          hasActivePlayerBilling: true,
          hasActiveTeamBilling: false,
          billingConflictFlag: false,
        };
      }
      return {};
    }

    case "TRANSFER_WINDOW_EXPIRED": {
      // If window expires without a player plan, archive
      if (profileState === ProfileState.TEAM_REMOVAL_PENDING_TRANSFER) {
        return {
          profileState: ProfileState.ARCHIVED_NO_ACTIVE_PLAN,
          // nobody is paying
          hasActiveTeamBilling: false,
          hasActivePlayerBilling: false,
        };
      }
      return {};
    }

    case "ADMIN_FORCE_ARCHIVE": {
      // For weird edge cases – support tool
      return {
        profileState: ProfileState.ARCHIVED_NO_ACTIVE_PLAN,
        ownershipMode: OwnershipMode.PLAYER_PRIMARY,
        ownerTeamId: null,
        hasActiveTeamBilling: false,
        hasActivePlayerBilling: false,
        billingConflictFlag: false,
      };
    }

    case "BILLING_CONFLICT_DETECTED": {
      return {
        billingConflictFlag: true,
      };
    }

    case "CLEAR_BILLING_CONFLICT": {
      return {
        billingConflictFlag: false,
      };
    }

    default:
      return {};
  }
}
