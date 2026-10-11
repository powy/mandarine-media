import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { SourceTextModule, SyntheticModule } from 'node:vm';

// Exercise the real orchestration methods with isolated service boundaries.
// No uploads, backend requests, or workbook writes are performed.
const source = await readFile(new URL(
  '../src/subtools/one-media-complete-upload/services/orchestrationService.js',
  import.meta.url
), 'utf8');

async function createService(asset) {
  let credentials;
  const retrievedIds = [];
  class MockMux {
    constructor(options) {
      credentials = options;
      this.video = { assets: { retrieve: async (id) => {
        retrievedIds.push(id);
        return asset;
      } } };
    }
  }
  const color = Object.assign((value) => value, { bold: (value) => value });
  const chalk = new Proxy({}, { get: () => color });
  const dependencies = {
    chalk: { default: chalk },
    'fs-extra': { default: { ensureDir: async () => {} } },
    path: { default: path },
    axios: { default: {} },
    '@mux/mux-node': { default: MockMux },
    '../../mux-upload/wrapper.js': { uploadToMux: () => { throw new Error('Unexpected upload'); } },
    '../../mux-subtitle-upload/wrapper.js': { uploadSubtitlesToMux: () => { throw new Error('Unexpected upload'); } },
    '../../picture-upload/wrapper.js': { uploadPicture: () => { throw new Error('Unexpected upload'); } }
  };
  const module = new SourceTextModule(source);
  await module.link((specifier) => {
    const exports = dependencies[specifier];
    assert.ok(exports, `Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    });
  });
  await module.evaluate();
  // Avoid the constructor's filesystem setup; test the actual methods below.
  const service = Object.create(module.namespace.OrchestrationService.prototype);
  service.config = { mux: { tokenId: 'test-id', tokenSecret: 'test-secret' } };
  service.logger = { info() {}, warn() {}, error() {} };
  service.buildFilesContext = () => ({});
  service.cleanupTempConfigs = async () => {};
  return { service, retrievedIds, getCredentials: () => credentials };
}

const video = { assetId: 'asset-1', fileName: 'episode.mp4', type: 'video', isMainVideo: true };
const readyAsset = {
  status: 'ready', playback_ids: [{ id: 'playback-1' }],
  tracks: [{ id: 'track-fr', status: 'ready' }]
};

test('Mux verification uses orchestration credentials and checks video/subtitle readiness', async () => {
  const { service, retrievedIds, getCredentials } = await createService(readyAsset);
  const result = await service.verifyMuxUploads([video], [
    { assetId: video.assetId, language: 'fr', trackId: 'track-fr' }
  ], new Map([[video.fileName, { languages: new Set(['fr']), type: 'video' }]]));
  assert.deepEqual(getCredentials(), { tokenId: 'test-id', tokenSecret: 'test-secret' });
  assert.equal(result.overall, 'success');
  assert.equal(result.videos.ready, 1);
  assert.equal(result.subtitles.ready, 1);
  assert.deepEqual(retrievedIds, ['asset-1', 'asset-1']);
});

test('Mux verification still fails when a requested subtitle is missing', async () => {
  const { service } = await createService(readyAsset);
  const result = await service.verifyMuxUploads([video], [],
    new Map([[video.fileName, { languages: new Set(['fr']), type: 'video' }]]));
  assert.equal(result.overall, 'failed');
  assert.equal(result.subtitles.missing.length, 1);
});

async function processUpload(apiResult) {
  const { service } = await createService(readyAsset);
  const workbookCalls = [];
  service.uploadVideosToMux = async () => ({ successes: [video], errors: [] });
  service.uploadSubtitlesToMux = async () => ({ successes: [], errors: [] });
  service.uploadImagesToS3 = async () => ({ successes: [], errors: [] });
  service.createMediaDescription = async () => apiResult;
  service.excelService = {
    saveMediaDescriptionToExcel: async (...args) => workbookCalls.push(['save', ...args]),
    renameExcelFile: async (file) => {
      workbookCalls.push(['rename', file]);
      return 'episode_uploaded.xlsx';
    }
  };
  const result = await service.processUploads(
    { description: { media_type: 'video' }, files: [] },
    { videos: [], images: [] }, 'episode', 'episode.xlsx'
  );
  return { result, workbookCalls };
}

test('Backend-skipped upload remains partial and leaves the workbook untouched', async () => {
  const { result, workbookCalls } = await processUpload({ success: false, skipped: true });
  assert.equal(result.checkup.overall, 'success');
  assert.equal(result.status, 'partial');
  assert.equal(result.backendSkipped, true);
  assert.equal(result.mediaDescriptionId, null);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(workbookCalls, []);
  assert.equal(result.excelRenamed, undefined);
});

test('Backend success saves the actual ID and renames the workbook', async () => {
  const { result, workbookCalls } = await processUpload({ success: true, id: 'description-1' });
  assert.equal(result.status, 'success');
  assert.equal(result.mediaDescriptionId, 'description-1');
  assert.deepEqual(workbookCalls, [
    ['save', 'episode.xlsx', 'description-1'], ['rename', 'episode.xlsx']
  ]);
  assert.equal(result.excelRenamed, true);
});

test('A backend response without an ID cannot write an empty ID or rename the workbook', async () => {
  const { workbookCalls } = await processUpload({ success: true });
  assert.deepEqual(workbookCalls, []);
});
