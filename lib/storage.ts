import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const localUploadDir = path.join(process.cwd(), 'public', 'uploads');

async function ensureLocalDir() {
  await fs.mkdir(localUploadDir, { recursive: true });
}

function getExtension(filename: string) {
  const match = filename.match(/\.[0-9a-z]+$/i);
  return match ? match[0] : '';
}

async function saveLocalFile(file: File, prefix: string) {
  await ensureLocalDir();
  const ext = getExtension(file.name) || '.jpg';
  const filename = `${prefix}-${uuidv4()}${ext}`;
  const targetPath = path.join(localUploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(targetPath, buffer);
  return `/uploads/${filename}`;
}

async function saveSupabaseFile(file: File, prefix: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.SUPABASE_BUCKET || 'player-media';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase storage variables are missing.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const ext = getExtension(file.name) || '.jpg';
  const filename = `${prefix}-${uuidv4()}${ext}`;
  const filePath = `${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucketName).upload(filePath, buffer, {
    contentType: file.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = await supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function saveFile(file: File, prefix: string) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return await saveSupabaseFile(file, prefix);
    } catch (error) {
      console.warn('Supabase upload failed, falling back to local storage:', error);
    }
  }

  return await saveLocalFile(file, prefix);
}
