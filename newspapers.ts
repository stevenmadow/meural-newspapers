import axios from 'axios';
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { exec } from 'child_process';

import { logger } from './logger';
import config from './config.json';
import newspapers from './newspapers.json';

export const NEWSPAPER_BASE_URL = 'https://cdn.freedomforum.org/dfp/pdf{DAY_OF_MONTH}/';
export const NEWSPAPAPER_CACHE_PATH = path.resolve(__dirname, './newspaper-cache');

export const downloadFile = async (url: string, filePath: string) => {
  logger(`Downloading ${url}`);
  try {
    const response = await axios(url, {
      responseType: 'arraybuffer',
    });
    await fs.writeFileSync(filePath, response.data);
  } catch (error: any) {
    logger(`Failed: ${error.message}`, { sentiment: 'negative', processLevel: 2 });
  }
};

export const getDirectoryContents = async (dir: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        reject(err);
        return;
      }
      if (!files) {
        console.error('No files found');
        reject('No files found');
        return;
      }
      const filteredFiles = files.filter(file => file !== 'jpgs' && !file.startsWith('.'));
      console.log('Filtered Files:', filteredFiles);
      resolve(filteredFiles);
    });
  });
};

export const clearDirectory = async (dir: string) => {
  const files = await getDirectoryContents(dir);
  for (const file of files) {
    fs.unlink(path.join(dir, file), err => {
      if (err) throw err;
    });
  }
};

export const downloadNewspaperPDFs = async () => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  const papersToDownload = [];
  const limit = pLimit(config.concurrent_downloads);

  for (const newspaper of newspapers) {
    papersToDownload.push(
      limit(() =>
        downloadFile(
          NEWSPAPER_BASE_URL.replace('{DAY_OF_MONTH}', `${dayOfMonth}`) + newspaper.url,
          `${NEWSPAPAPER_CACHE_PATH}/${newspaper.shortname}_${month}_${dayOfMonth}.pdf`
        )
      )
    );
  }

  await Promise.all(papersToDownload);
};

export const convertPdfToImage = async (inputFile: string, outputDir: string) => {
  return new Promise((resolve, reject) => {
    exec(`python3 pdf_to_image.py "${inputFile}" "${outputDir}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error converting PDF to image: ${error.message}`);
        reject(error);
        return;
      }
      resolve(true);
    });
  });
};

export const processPdf = async (inputFile: string, outputDir: string) => {
  logger(`Converting ${inputFile}`);
  await convertPdfToImage(inputFile, outputDir);
  logger(`Processed ${inputFile}`, { sentiment: 'positive' });
};
