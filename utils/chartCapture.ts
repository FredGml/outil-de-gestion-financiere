import html2canvas from 'html2canvas';

/**
 * Convertit un élément DOM (graphique) en image base64
 * @param elementId - L'ID de l'élément DOM à capturer
 * @returns Promise avec l'image en base64
 */
export const captureChartAsImage = async (elementId: string): Promise<string | null> => {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with ID "${elementId}" not found`);
            return null;
        }

        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher quality
            logging: false,
            useCORS: true
        });

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error capturing chart:', error);
        return null;
    }
};

/**
 * Capture plusieurs graphiques et retourne un tableau d'images
 * @param elementIds - Tableau d'IDs des éléments à capturer
 * @returns Promise avec un tableau d'images en base64
 */
export const captureMultipleCharts = async (elementIds: string[]): Promise<(string | null)[]> => {
    const images: (string | null)[] = [];
    
    for (const id of elementIds) {
        const image = await captureChartAsImage(id);
        images.push(image);
    }
    
    return images;
};
