import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Otimiza uma imagem reduzindo seu tamanho sem perda significativa de qualidade
 * @param inputBuffer Buffer da imagem original
 * @param options Opções de otimização
 * @returns Buffer da imagem otimizada
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}
): Promise<Buffer> {
  const {
    width,
    height,
    quality = 80, // Qualidade padrão de 80% (bom equilíbrio entre tamanho e qualidade)
    format = 'jpeg', // Formato padrão
  } = options;

  console.log(`Otimizando imagem: tamanho original: ${inputBuffer.length} bytes`);

  try {
    // Criar uma instância do sharp com o buffer de entrada
    let imageProcessor = sharp(inputBuffer);

    // Redimensionar se largura ou altura forem especificadas
    if (width || height) {
      imageProcessor = imageProcessor.resize({
        width,
        height,
        fit: 'inside', // Mantém a proporção da imagem
        withoutEnlargement: true, // Não amplia imagens pequenas
      });
    }

    // Converter e otimizar para o formato especificado
    let outputBuffer: Buffer;
    if (format === 'jpeg') {
      outputBuffer = await imageProcessor
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } else if (format === 'png') {
      outputBuffer = await imageProcessor
        .png({ quality, compressionLevel: 9 }) // Nível máximo de compressão
        .toBuffer();
    } else if (format === 'webp') {
      outputBuffer = await imageProcessor
        .webp({ quality })
        .toBuffer();
    } else {
      // Fallback para JPEG se o formato não for reconhecido
      outputBuffer = await imageProcessor
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    }

    console.log(`Imagem otimizada: novo tamanho: ${outputBuffer.length} bytes (redução de ${Math.round((1 - outputBuffer.length / inputBuffer.length) * 100)}%)`);
    return outputBuffer;
  } catch (error) {
    console.error('Erro na otimização da imagem:', error);
    // Em caso de erro, retorna o buffer original
    return inputBuffer;
  }
}

/**
 * Salva uma imagem otimizada no sistema de arquivos
 * @param inputBuffer Buffer da imagem original
 * @param outputPath Caminho para salvar a imagem otimizada
 * @param options Opções de otimização
 * @returns Caminho da imagem otimizada salva
 */
export async function saveOptimizedImage(
  inputBuffer: Buffer,
  outputPath: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}
): Promise<string> {
  try {
    // Garantir que o diretório exista
    const dir = path.dirname(outputPath);
    await mkdirAsync(dir, { recursive: true }).catch(() => {});

    // Otimizar a imagem
    const optimizedBuffer = await optimizeImage(inputBuffer, options);

    // Salvar no caminho especificado
    await writeFileAsync(outputPath, optimizedBuffer);
    
    return outputPath;
  } catch (error) {
    console.error('Erro ao salvar imagem otimizada:', error);
    throw error;
  }
}

/**
 * Otimiza uma imagem existente no sistema de arquivos
 * @param inputPath Caminho da imagem original
 * @param outputPath Caminho para salvar a imagem otimizada (opcional, se não especificado substitui o original)
 * @param options Opções de otimização
 * @returns Caminho da imagem otimizada salva
 */
export async function optimizeExistingImage(
  inputPath: string,
  outputPath: string = inputPath,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}
): Promise<string> {
  try {
    // Ler a imagem original
    const inputBuffer = await readFileAsync(inputPath);
    
    // Otimizar e salvar
    return await saveOptimizedImage(inputBuffer, outputPath, options);
  } catch (error) {
    console.error(`Erro ao otimizar imagem existente (${inputPath}):`, error);
    throw error;
  }
}

/**
 * Converte uma imagem para o formato de dados URI base64
 * @param buffer Buffer da imagem
 * @param mimeType Tipo MIME da imagem
 * @returns String da imagem em formato de dados URI
 */
export function bufferToDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Converte um dado URI base64 para buffer
 * @param dataUri URI de dados da imagem
 * @returns Buffer da imagem
 */
export function dataUriToBuffer(dataUri: string): Buffer {
  // Remover o prefixo "data:image/xxx;base64,"
  const base64String = dataUri.split(',')[1];
  return Buffer.from(base64String, 'base64');
}