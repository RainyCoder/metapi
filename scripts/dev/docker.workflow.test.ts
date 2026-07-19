import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('docker workflows', () => {
  it('publishes armv7 docker images in ci and release workflows', () => {
    const ciWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    const releaseWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/release.yml'), 'utf8');

    expect(ciWorkflow).toContain('arch: armv7');
    expect(ciWorkflow).toContain('platform: linux/arm/v7');
    expect(ciWorkflow).toContain('"${tag}-armv7"');

    expect(releaseWorkflow).toContain('arch: armv7');
    expect(releaseWorkflow).toContain('platform: linux/arm/v7');
    expect(releaseWorkflow).toContain('"${tag}-armv7"');
  });

  it('derives Docker Hub image names from the configured username secret', () => {
    const ciWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    const releaseWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/release.yml'), 'utf8');

    expect(ciWorkflow).toContain('DOCKERHUB_IMAGE: ${{ secrets.DOCKERHUB_USERNAME }}/metapi');
    expect(ciWorkflow).not.toContain('images: 1467078763/metapi');

    expect(releaseWorkflow).toContain('DOCKERHUB_IMAGE: ${{ secrets.DOCKERHUB_USERNAME }}/metapi');
    expect(releaseWorkflow).not.toContain('1467078763/metapi');
  });

  it('uses an armv7-capable node base image in the Dockerfile', () => {
    const dockerfile = readFileSync(resolve(process.cwd(), 'docker/Dockerfile'), 'utf8');

    expect(dockerfile).toContain('FROM node:22-bookworm-slim AS builder');
    expect(dockerfile).toContain('FROM node:22-bookworm-slim');
  });

  it('avoids buildkit-only frontend syntax so managed docker builders can parse it reliably', () => {
    const dockerfile = readFileSync(resolve(process.cwd(), 'docker/Dockerfile'), 'utf8');

    expect(dockerfile).not.toContain('# syntax=docker/dockerfile:');
    expect(dockerfile).not.toContain('RUN --mount=type=cache');
  });

  it('keeps server docker builds isolated from desktop packaging dependencies', () => {
    const dockerfile = readFileSync(resolve(process.cwd(), 'docker/Dockerfile'), 'utf8');
    const devDockerfile = readFileSync(resolve(process.cwd(), 'docker/Dockerfile.dev'), 'utf8');
    const devCompose = readFileSync(resolve(process.cwd(), 'docker/docker-compose.dev.yml'), 'utf8');

    expect(dockerfile).toContain('npm ci --ignore-scripts --no-audit --no-fund');
    expect(dockerfile).toContain('npm rebuild esbuild sharp better-sqlite3 --no-audit --no-fund');
    expect(dockerfile).not.toContain('npm ci --no-audit --no-fund');
    expect(dockerfile).toContain('RUN npm run build:web && npm run build:server');
    expect(dockerfile).toContain('npm prune --omit=dev --no-audit --no-fund');

    expect(devDockerfile).toContain('--ignore-scripts');
    expect(devDockerfile).toContain('FROM node:25-bookworm-slim');
    expect(devDockerfile).toContain('--registry="${NPM_REGISTRY}"');
    expect(devDockerfile).toContain('--fetch-retries="${NPM_FETCH_RETRIES}"');
    expect(devDockerfile).toContain('--fetch-timeout="${NPM_FETCH_TIMEOUT}"');
    expect(devDockerfile).toContain('--maxsockets="${NPM_MAXSOCKETS}"');
    expect(devDockerfile).toContain('RUN --mount=type=cache,target=/root/.npm,sharing=locked');
    expect(devDockerfile).toContain('retrying with the cached packages');
    expect(devDockerfile).toContain('npm rebuild esbuild sharp better-sqlite3 --no-audit --no-fund');
    expect(devDockerfile).not.toContain('RUN npm ci --no-audit --no-fund');
    expect(devCompose).not.toContain('HTTP_PROXY:');
    expect(devCompose).not.toContain('HTTPS_PROXY:');
    expect(devCompose).toContain('- "4000:5173"');
    expect(devCompose).not.toContain('- "4000:4000"');
    expect(devCompose).not.toContain('- "5173:5173"');
  });
});
