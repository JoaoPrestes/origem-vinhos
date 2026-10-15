import { getAuthenticatedUser } from '../identity/identity.handlers';
import { existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');

// Garante que o diretório public/uploads exista
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleFileUpload(req: Request): Promise<Response> {
  // Verificação de permissão de Administrador
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return jsonResponse({ error: 'Não autorizado. Faça login como administrador.' }, 401);
  }
  if (user.profile !== 'Admin') {
    return jsonResponse({ error: 'Acesso proibido. Apenas administradores podem fazer upload de imagens.' }, 403);
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ error: 'O formato do conteúdo deve ser multipart/form-data.' }, 400);
    }

    const formData = await req.formData();
    const file = (formData.get('image') || formData.get('file')) as File | null;

    if (!file || typeof file === 'string') {
      return jsonResponse({ error: 'Nenhum arquivo de imagem foi enviado.' }, 400);
    }

    // Validação do tipo de arquivo (MIME Type)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({ error: 'Formato de imagem não suportado. Use JPG, PNG, WEBP, GIF ou SVG.' }, 400);
    }

    // Tamanho máximo: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return jsonResponse({ error: 'O tamanho da imagem não pode ultrapassar 10MB.' }, 400);
    }

    // Extensão e nome único de arquivo
    const rawExt = extname(file.name) || '';
    const ext = rawExt ? rawExt.toLowerCase() : file.type.includes('png') ? '.png' : file.type.includes('webp') ? '.webp' : '.jpg';
    const filename = `wine-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const filePath = join(UPLOADS_DIR, filename);

    // Salva o arquivo no disco com o Bun.write
    const arrayBuffer = await file.arrayBuffer();
    await Bun.write(filePath, arrayBuffer);

    const publicUrl = `/uploads/${filename}`;
    return jsonResponse({ message: 'Upload realizado com sucesso.', url: publicUrl }, 201);
  } catch (error: any) {
    return jsonResponse({ error: error.message || 'Erro interno ao realizar upload da imagem.' }, 500);
  }
}
