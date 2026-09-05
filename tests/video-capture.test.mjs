import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('capture rejects stale player identities and preserves existing records', () => {
  const result = spawnSync('python3', ['-c', `
import json, os, runpy, tempfile
from pathlib import Path
with tempfile.TemporaryDirectory() as root:
    os.environ['VIDEO_CORPUS_ROOT'] = root + '/corpus'
    os.environ['VIDEO_CAPTURE_MANIFEST'] = root + '/manifest.json'
    spec = {'platform':'youtube','video_id':'expected','channel_id':'channel','url':'https://www.youtube.com/watch?v=expected','title':'Expected'}
    Path(os.environ['VIDEO_CAPTURE_MANIFEST']).write_text(json.dumps([spec]))
    def js(code):
        assert not code.startswith('fetch('), 'must not fetch mismatched captions'
        return {'videoId':'wrong','pageVideoId':'expected','channelId':'channel','baseUrl':'https://example.com/captions'}
    helpers = {'new_tab':lambda _:None,'goto_url':lambda _:None,'wait_for_load':lambda:None,'js':js}
    runpy.run_path('scripts/video-browser-capture.py', init_globals=helpers)
    record = Path(root + '/corpus/youtube/channel/expected/metadata.json')
    original = record.read_bytes()
    assert json.loads(original)['status'] == 'failed'
    assert not (record.parent / 'captions-original.vtt').exists()
    try:
        runpy.run_path('scripts/video-browser-capture.py', init_globals=helpers)
        raise AssertionError('overwrite was allowed')
    except FileExistsError:
        pass
    assert record.read_bytes() == original
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
