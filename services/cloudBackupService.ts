
import { db } from './electronDB';
import { exportService } from './exportService';

export type CloudBackupResult = 'success' | 'skipped' | 'offline' | 'error' | 'not_configured';

/**
 * Checks if a cloud backup is needed and performs it.
 */
export const checkAndPerformCloudBackup = async (): Promise<CloudBackupResult> => {
    try {
        const config = await db.backup.getCloudConfig();
        if (!config.path) return 'not_configured';

        const lastBackupStr = config.lastBackup;
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

        let needsBackup = false;
        if (!lastBackupStr) {
            needsBackup = true;
        } else {
            const lastBackupDate = new Date(lastBackupStr);
            if (lastBackupDate < threeDaysAgo) {
                needsBackup = true;
            }
        }

        if (!needsBackup) return 'skipped';

        // Check Internet Connection
        if (!navigator.onLine) {
            return 'offline';
        }

        console.log('Starting Cloud Backup...');
        
        const allData = await exportService.getAllData();
        const jsonString = JSON.stringify(allData, null, 2);

        const result = await db.backup.saveToCloud(jsonString);
        
        if (result.success) {
            return 'success';
        } else {
            console.error('Cloud Backup failed:', result.error);
            return 'error';
        }

    } catch (error) {
        console.error('Error in Cloud Backup routine:', error);
        return 'error';
    }
};
