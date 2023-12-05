import fs from 'fs';
import path from 'path';

import ExchangeApiService from './services/exchangeApi.service';
import PublisherService from './services/publisher.service';

import { OracleConfig } from './common/types';
import { HTTPS_NODE_URL } from './common/constants';

import QuoteProvider from './providers/quote.provider';
import { getErrorMessage } from './common/utils';

async function start(): Promise<void> {
  const inputDir = process.env.INPUT_DATA_FOLDER;
  if (!inputDir) throw new Error("Env variable INPUT_DATA_FOLDER is not defined");

  let rootCertificates: Buffer[] = [];
  let configDir: string, configData;
  const ls = fs.readdirSync(inputDir);
  for (const dirName of ls) {
    try {
      configDir = path.join(inputDir, dirName);
      const inputPath = path.join(configDir, "input.json")
      configData = fs.readFileSync(inputPath, { encoding: 'utf8', flag: 'r' })
      rootCertificates = fs.readdirSync(configDir)
      .filter(fileName => fileName.endsWith(`.crt`))
      .map(certName => fs.readFileSync(
        path.join(configDir, certName)
      ));

      break;
    } catch (e) {
      continue;
    }
  }

  if (!configData) throw new Error("Input file doesn't exist");
  const config: OracleConfig = JSON.parse(configData);
  console.log('Input extracted');

  const btcUsdRateApi = new ExchangeApiService(config.apiConfig, rootCertificates);
  console.log('Exchange rate service created');

  const quoteProvider = new QuoteProvider(config.debugMode);
  await quoteProvider.initialiaze();
  console.log('Quote provider created');

  const pubService = new PublisherService(HTTPS_NODE_URL, config, btcUsdRateApi, quoteProvider);
  console.log('Blockchain service initialized');

  await pubService.start();
}

start().catch((err: Error) => {
  console.log(getErrorMessage(err));
});