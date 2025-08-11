import { postResume } from "@/server/api/runs/resume";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return postResume(req, { id: params.id });
}

