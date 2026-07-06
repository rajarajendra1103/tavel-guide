import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { scheduleTravelReminder } from './capacitor';

const OFFLINE_GUIDES_DIR = 'offline_guides';

// Ensure the guides directory exists
const ensureDirectoryExists = async () => {
  try {
    await Filesystem.mkdir({
      path: OFFLINE_GUIDES_DIR,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (err: any) {
    // Ignore error if directory already exists
    if (!err.message?.includes('already exists') && !err.message?.includes('Folder exists')) {
      console.error('Failed to create offline directory:', err);
    }
  }
};

/**
 * Downloads a destination guide JSON payload to the local file system.
 */
export const downloadDestinationGuide = async (dest: any): Promise<boolean> => {
  if (!dest || !dest.id) return false;

  try {
    await ensureDirectoryExists();

    const fileName = `${OFFLINE_GUIDES_DIR}/${dest.id}.json`;
    const dataString = JSON.stringify(dest, null, 2);

    await Filesystem.writeFile({
      path: fileName,
      data: dataString,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    console.log(`[Offline Service] Successfully downloaded guide for ${dest.name} to filesystem.`);

    // Trigger native local notification
    await scheduleTravelReminder(
      'Download Completed 📥',
      `Your travel guide for ${dest.name} is now saved and available offline.`,
      1
    );

    return true;
  } catch (error) {
    console.error('Failed to download destination guide to filesystem:', error);
    return false;
  }
};

/**
 * Reads a locally downloaded destination guide.
 */
export const readDownloadedGuide = async (destId: string): Promise<any | null> => {
  try {
    const fileName = `${OFFLINE_GUIDES_DIR}/${destId}.json`;
    const result = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    if (result.data) {
      const dataStr = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      return JSON.parse(dataStr);
    }
    return null;
  } catch (error) {
    console.warn(`[Offline Service] Guide for ${destId} not found in filesystem:`, error);
    return null;
  }
};

/**
 * Deletes a locally downloaded destination guide.
 */
export const deleteDownloadedGuide = async (destId: string): Promise<boolean> => {
  try {
    const fileName = `${OFFLINE_GUIDES_DIR}/${destId}.json`;
    await Filesystem.deleteFile({
      path: fileName,
      directory: Directory.Documents,
    });
    return true;
  } catch (error) {
    console.error(`Failed to delete guide for ${destId}:`, error);
    return false;
  }
};

/**
 * Lists all downloaded guide IDs in the filesystem.
 */
export const listDownloadedGuides = async (): Promise<string[]> => {
  try {
    await ensureDirectoryExists();
    const result = await Filesystem.readdir({
      path: OFFLINE_GUIDES_DIR,
      directory: Directory.Documents,
    });

    return result.files.map(file => {
      const name = typeof file === 'string' ? file : file.name;
      return name.replace('.json', '');
    });
  } catch (error) {
    console.error('Failed to list downloaded guides:', error);
    return [];
  }
};
