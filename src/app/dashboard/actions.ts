"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role, TransactionType } from "@/types/database";
import { toMemberAuthEmail, toMemberLoginId } from "@/lib/member-id";

const maxImageSize = 2 * 1024 * 1024;
const validImageTypes = ["image/jpeg", "image/png"];
type Actor = { supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>; id: string; role: Role };

async function actor(roles: Role[]): Promise<Actor | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  const { data: profile, error } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).maybeSingle();
  if (error) console.error("Action profile lookup failed:", error);
  if (!profile?.is_active || !roles.includes(profile.role)) return null;
  return { supabase, id: user.id, role: profile.role };
}

function finish(path: string, status: string): never {
  redirect(`${path}?status=${status}`);
}

export async function updateProfile(form: FormData) {
  const current = await actor(["ADMIN", "COMMITTEE", "MEMBER"]);
  if (!current) finish("/dashboard/profile", "denied");
  const fullName = String(form.get("full_name") ?? "").trim();
  const mobile = String(form.get("mobile") ?? "").trim();
  const address = String(form.get("address") ?? "").trim();
  const file = form.get("photo");
  const loginId = toMemberLoginId(mobile);
  const authEmail = toMemberAuthEmail(mobile);
  const { data: { user } } = await current.supabase.auth.getUser();
  if (!fullName || !loginId || !authEmail) finish("/dashboard/profile", "error");
  if (authEmail !== user?.email) finish("/dashboard/profile", "phone-locked");
  const update: { full_name: string; address: string | null; profile_photo_url?: string } = {
    full_name: fullName,
    address: address || null,
  };
  let photoPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!validImageTypes.includes(file.type) || file.size > maxImageSize) finish("/dashboard/profile", "image-error");
    photoPath = `${current.id}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
    const { error: uploadError } = await current.supabase.storage.from("profile-photos").upload(photoPath, file, { contentType: file.type });
    if (uploadError) {
      console.error("Profile photo update failed:", uploadError);
      finish("/dashboard/profile", "error");
    }
    update.profile_photo_url = photoPath;
  }
  const { error } = await current.supabase.from("profiles").update(update).eq("id", current.id);
  if (error) {
    console.error("Profile update failed:", error);
    if (photoPath) {
      const { error: cleanupError } = await current.supabase.storage.from("profile-photos").remove([photoPath]);
      if (cleanupError) console.error("Unused profile photo cleanup failed:", cleanupError);
    }
    finish("/dashboard/profile", "error");
  }
  finish("/dashboard/profile", "updated");
}

export async function addTransaction(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/transactions", "denied");
  const type = String(form.get("transaction_type") ?? "") as TransactionType;
  const amount = Number(form.get("amount"));
  const donor = String(form.get("donor_or_recipient") ?? "").trim();
  const categoryId = String(form.get("category_id") ?? "");
  const date = String(form.get("transaction_date") ?? "");
  if (!["INCOME", "EXPENSE"].includes(type) || !Number.isFinite(amount) || amount <= 0 || !donor || !categoryId) {
    finish("/dashboard/transactions", "error");
  }
  const { data: category, error: categoryError } = await current.supabase
    .from("transaction_categories").select("id, type, is_active").eq("id", categoryId).maybeSingle();
  if (categoryError || !category || !category.is_active || category.type !== type) {
    if (categoryError) console.error("Transaction category validation failed:", categoryError);
    finish("/dashboard/transactions", "error");
  }
  const { error } = await current.supabase.from("transactions").insert({
    transaction_type: type,
    amount,
    donor_or_recipient: donor,
    category_id: categoryId,
    description: String(form.get("description") ?? "").trim() || null,
    transaction_date: date || null,
    created_by: current.id,
  });
  if (error) {
    console.error("Transaction insert failed:", error);
    finish("/dashboard/transactions", "error");
  }
  finish("/dashboard/transactions", "saved");
}

export async function updateTransaction(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/transactions", "denied");
  const id = String(form.get("id") ?? "");
  const amount = Number(form.get("amount"));
  const date = String(form.get("transaction_date") ?? "");
  const party = String(form.get("donor_or_recipient") ?? "").trim();
  if (!id || !Number.isFinite(amount) || amount <= 0 || !party) finish("/dashboard/transactions", "error");
  const { error } = await current.supabase.from("transactions").update({
    amount,
    transaction_date: date || null,
    donor_or_recipient: party,
    description: String(form.get("description") ?? "").trim() || null,
  }).eq("id", id);
  if (error) {
    console.error("Transaction update failed:", error);
    finish("/dashboard/transactions", "error");
  }
  finish("/dashboard/transactions", "updated");
}

export async function addCategory(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/transactions", "denied");
  const name = String(form.get("name") ?? "").trim();
  const type = String(form.get("type") ?? "") as TransactionType;
  if (!name || !["INCOME", "EXPENSE"].includes(type)) finish("/dashboard/transactions", "error");
  const { error } = await current.supabase.from("transaction_categories").insert({ name, type });
  if (error) {
    console.error("Category insert failed:", error);
    finish("/dashboard/transactions", "error");
  }
  finish("/dashboard/transactions", "saved");
}

export async function addNotice(form: FormData) {
  const current = await actor(["ADMIN", "COMMITTEE"]);
  if (!current) finish("/dashboard/notices", "denied");
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const file = form.get("image");
  let imageUrl: string | null = null;
  let uploadedPath: string | null = null;

  if (!title || !content) finish("/dashboard/notices", "error");
  if (file instanceof File && file.size > 0) {
    if (!validImageTypes.includes(file.type) || file.size > maxImageSize) finish("/dashboard/notices", "image-error");
    const extension = file.type === "image/png" ? "png" : "jpg";
    uploadedPath = `${current.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await current.supabase.storage.from("notice-images").upload(uploadedPath, file, { contentType: file.type });
    if (uploadError) {
      console.error("Notice image upload failed:", uploadError);
      finish("/dashboard/notices", "error");
    }
    imageUrl = current.supabase.storage.from("notice-images").getPublicUrl(uploadedPath).data.publicUrl;
  }
  const { error } = await current.supabase.from("notices").insert({
    title,
    content,
    image_url: imageUrl,
    author_id: current.id,
    is_pinned: false,
  });
  if (error) {
    console.error("Notice insert failed:", error);
    if (uploadedPath) {
      const { error: cleanupError } = await current.supabase.storage.from("notice-images").remove([uploadedPath]);
      if (cleanupError) console.error("Unused notice image cleanup failed:", cleanupError);
    }
    finish("/dashboard/notices", "error");
  }
  finish("/dashboard/notices", "saved");
}

export async function deleteNotice(form: FormData) {
  const current = await actor(["ADMIN", "COMMITTEE"]);
  if (!current) finish("/dashboard/notices", "denied");
  const id = String(form.get("id") ?? "");
  const { data, error } = await current.supabase.from("notices").delete().eq("id", id).select("id");
  if (error || !data?.length) {
    if (error) console.error("Notice delete failed:", error);
    finish("/dashboard/notices", "error");
  }
  finish("/dashboard/notices", "deleted");
}

export async function updateNotice(form: FormData) {
  const current = await actor(["ADMIN", "COMMITTEE"]);
  if (!current) finish("/dashboard/notices", "denied");
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const file = form.get("image");
  if (!id || !title || !content) finish("/dashboard/notices", "error");
  let imageUrl: string | undefined;
  let imagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!validImageTypes.includes(file.type) || file.size > maxImageSize) finish("/dashboard/notices", "image-error");
    imagePath = `${current.id}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
    const { error: uploadError } = await current.supabase.storage.from("notice-images").upload(imagePath, file, { contentType: file.type });
    if (uploadError) {
      console.error("Notice image replacement upload failed:", uploadError);
      finish("/dashboard/notices", "error");
    }
    imageUrl = current.supabase.storage.from("notice-images").getPublicUrl(imagePath).data.publicUrl;
  }
  const { data, error } = await current.supabase.from("notices").update({
    title,
    content,
    ...(imageUrl ? { image_url: imageUrl } : {}),
  }).eq("id", id).select("id");
  if (error || !data?.length) {
    if (error) console.error("Notice update failed:", error);
    if (imagePath) {
      const { error: cleanupError } = await current.supabase.storage.from("notice-images").remove([imagePath]);
      if (cleanupError) console.error("Unused replacement notice image cleanup failed:", cleanupError);
    }
    finish("/dashboard/notices", "error");
  }
  finish("/dashboard/notices", "updated");
}

export async function toggleNoticePin(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/notices", "denied");
  const id = String(form.get("id") ?? "");
  const pinned = String(form.get("is_pinned") ?? "") === "true";
  const { error } = await current.supabase.from("notices").update({ is_pinned: !pinned }).eq("id", id);
  if (error) {
    console.error("Notice pin update failed:", error);
    finish("/dashboard/notices", "error");
  }
  finish("/dashboard/notices", "updated");
}

export async function setMemberAccess(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/members", "denied");
  const id = String(form.get("id") ?? "");
  const role = String(form.get("role") ?? "") as Role;
  const active = String(form.get("active") ?? "") === "true";
  if (!id || !["COMMITTEE", "MEMBER"].includes(role)) finish("/dashboard/members", "error");
  const { error } = await current.supabase.rpc("set_member_access", {
    target_profile_id: id,
    target_role: role,
    target_is_active: active,
  });
  if (error) {
    console.error("Member access update failed:", error);
    finish("/dashboard/members", "error");
  }
  finish("/dashboard/members", "updated");
}

export async function addCommitteeMember(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/committee", "denied");
  const profileId = String(form.get("profile_id") ?? "");
  const position = String(form.get("position") ?? "").trim();
  const order = Number(form.get("display_order") ?? 0);
  const bio = String(form.get("bio") ?? "").trim();
  const file = form.get("photo");
  if (!profileId || !position || !Number.isInteger(order)) finish("/dashboard/committee", "error");
  let photoUrl: string | null = null;
  let photoPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!validImageTypes.includes(file.type) || file.size > maxImageSize) finish("/dashboard/committee", "image-error");
    photoPath = `${profileId}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
    const { error: uploadError } = await current.supabase.storage.from("committee-photos").upload(photoPath, file, { contentType: file.type });
    if (uploadError) {
      console.error("Committee photo upload failed:", uploadError);
      finish("/dashboard/committee", "error");
    }
    photoUrl = current.supabase.storage.from("committee-photos").getPublicUrl(photoPath).data.publicUrl;
  }
  const { error } = await current.supabase.from("committee_members").insert({
    profile_id: profileId,
    position,
    display_order: order,
    bio: bio || null,
    photo_url: photoUrl,
  });
  if (error) {
    console.error("Committee member insert failed:", error);
    if (photoPath) {
      const { error: cleanupError } = await current.supabase.storage.from("committee-photos").remove([photoPath]);
      if (cleanupError) console.error("Unused committee photo cleanup failed:", cleanupError);
    }
    finish("/dashboard/committee", "error");
  }
  finish("/dashboard/committee", "saved");
}

export async function updateCommitteeMember(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/committee", "denied");
  const id = String(form.get("id") ?? "");
  const position = String(form.get("position") ?? "").trim();
  const order = Number(form.get("display_order") ?? 0);
  const bio = String(form.get("bio") ?? "").trim();
  const file = form.get("photo");
  if (!id || !position || !Number.isInteger(order)) finish("/dashboard/committee", "error");
  const update: { position: string; display_order: number; bio: string | null; photo_url?: string } = {
    position,
    display_order: order,
    bio: bio || null,
  };
  let photoPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!validImageTypes.includes(file.type) || file.size > maxImageSize) finish("/dashboard/committee", "image-error");
    photoPath = `${id}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
    const { error: uploadError } = await current.supabase.storage.from("committee-photos").upload(photoPath, file, { contentType: file.type });
    if (uploadError) {
      console.error("Committee photo update failed:", uploadError);
      finish("/dashboard/committee", "error");
    }
    update.photo_url = current.supabase.storage.from("committee-photos").getPublicUrl(photoPath).data.publicUrl;
  }
  const { error } = await current.supabase.from("committee_members").update(update).eq("id", id);
  if (error) {
    console.error("Committee member update failed:", error);
    if (photoPath) {
      const { error: cleanupError } = await current.supabase.storage.from("committee-photos").remove([photoPath]);
      if (cleanupError) console.error("Unused committee photo cleanup failed:", cleanupError);
    }
    finish("/dashboard/committee", "error");
  }
  finish("/dashboard/committee", "updated");
}

export async function removeCommitteeMember(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/committee", "denied");
  const id = String(form.get("id") ?? "");
  const { error } = await current.supabase.from("committee_members").update({ is_current: false }).eq("id", id);
  if (error) {
    console.error("Committee member update failed:", error);
    finish("/dashboard/committee", "error");
  }
  finish("/dashboard/committee", "updated");
}

export async function recordDonationSubmission(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/donations", "denied");
  const submissionId = String(form.get("submission_id") ?? "");
  const categoryId = String(form.get("category_id") ?? "");
  const date = String(form.get("donation_date") ?? "");
  if (!submissionId || !categoryId) finish("/dashboard/donations", "error");
  const { error } = await current.supabase.rpc("record_donation_submission", {
    submission_id: submissionId,
    income_category_id: categoryId,
    donation_date: date || null,
  });
  if (error) {
    console.error("Donation submission could not be recorded:", error);
    finish("/dashboard/donations", error.code === "23505" ? "duplicate" : "error");
  }
  finish("/dashboard/donations", "recorded");
}

export async function rejectDonationSubmission(form: FormData) {
  const current = await actor(["ADMIN"]);
  if (!current) finish("/dashboard/donations", "denied");
  const submissionId = String(form.get("submission_id") ?? "");
  if (!submissionId) finish("/dashboard/donations", "error");
  const { error } = await current.supabase.rpc("reject_donation_submission", { submission_id: submissionId });
  if (error) {
    console.error("Donation submission could not be rejected:", error);
    finish("/dashboard/donations", "error");
  }
  finish("/dashboard/donations", "rejected");
}
