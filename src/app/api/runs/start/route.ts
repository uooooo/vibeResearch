import { postStart } from "@/server/api/runs/start";

export async function POST(req: Request) {
  return postStart(req);
}

