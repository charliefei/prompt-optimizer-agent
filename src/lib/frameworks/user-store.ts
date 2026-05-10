import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { UserFramework } from "@/types/framework";

const STORE_DIR = path.join(process.cwd(), "data", "user-frameworks");

async function ensureDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

export async function saveUserFramework(
  data: Omit<UserFramework, "id" | "createdAt">
): Promise<UserFramework> {
  await ensureDir();
  const framework: UserFramework = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const filePath = path.join(STORE_DIR, `${framework.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(framework, null, 2), "utf-8");
  return framework;
}

export async function getUserFrameworks(): Promise<UserFramework[]> {
  await ensureDir();
  const files = await fs.readdir(STORE_DIR);
  const frameworks: UserFramework[] = [];
  for (const file of files) {
    if (file.endsWith(".json")) {
      const content = await fs.readFile(path.join(STORE_DIR, file), "utf-8");
      frameworks.push(JSON.parse(content));
    }
  }
  return frameworks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getUserFramework(id: string): Promise<UserFramework | null> {
  try {
    const filePath = path.join(STORE_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function deleteUserFramework(id: string): Promise<boolean> {
  try {
    const filePath = path.join(STORE_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
