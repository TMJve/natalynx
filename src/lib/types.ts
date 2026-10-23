import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

export type Client = Tables["clients"]["Row"];
export type Project = Tables["projects"]["Row"];
export type Stage = Tables["stages"]["Row"];
export type Payment = Tables["payments"]["Row"];
export type Update = Tables["updates"]["Row"];
export type Approval = Tables["approvals"]["Row"];
export type FileRow = Tables["files"]["Row"];

export type StageStatus = Database["public"]["Enums"]["stage_status"];
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
  done: "Done",
};
