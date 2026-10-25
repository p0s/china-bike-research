import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('avif_encoder', ROOT / 'scripts/encode-avif.py')
encoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(encoder)


class EncoderTests(unittest.TestCase):
    def test_pixels_dimensions_alpha_and_metadata(self):
        with tempfile.TemporaryDirectory(prefix='bike-avif-test-') as directory:
            source = Path(directory) / 'source.png'
            image = Image.new('RGBA', (320, 200), (35, 100, 60, 255))
            image.putpixel((0, 0), (0, 0, 0, 0))
            exif = Image.Exif()
            exif[270] = 'Synthetic metadata that must not ship'
            image.save(source, exif=exif)
            payload, metadata = encoder.encode(source, width=480, max_bytes=40_000)
            self.assertEqual((metadata['width'], metadata['height']), (320, 200))
            self.assertEqual(metadata['sha256'], hashlib.sha256(payload).hexdigest())
            with Image.open(io.BytesIO(payload)) as result:
                self.assertEqual(result.format, 'AVIF')
                self.assertEqual(result.getpixel((0, 0))[3], 0)
                self.assertFalse(result.info.get('exif'))
                self.assertFalse(result.info.get('icc_profile'))
                self.assertFalse(result.info.get('xmp'))
            with self.assertRaisesRegex(ValueError, 'cannot meet'):
                encoder.encode(source, max_bytes=1, quality_start=60, quality_minimum=60)

    def test_actual_import_command_keeps_source_provenance_and_immutable_variants(self):
        with tempfile.TemporaryDirectory(prefix='bike-avif-import-') as directory:
            source = Path(directory) / 'source.png'
            Image.new('RGB', (640, 400), '#427750').save(source)
            command = ['node', 'scripts/optimize-image.mjs', '--input', str(source),
                       '--output', str(Path(directory) / 'output'), '--slug', 'synthetic-bike']
            env = {**os.environ, 'MEDIA_PYTHON': sys.executable, 'PYTHONDONTWRITEBYTECODE': '1'}
            run = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            manifest = json.loads(run.stdout)
            self.assertEqual(manifest['source']['sha256'], hashlib.sha256(source.read_bytes()).hexdigest())
            self.assertEqual(manifest['source']['width'], 640)
            for variant in manifest['variants']:
                file = Path(directory) / 'output/synthetic-bike' / variant['file']
                self.assertEqual(variant['format'], 'image/avif')
                self.assertTrue(variant['file'].startswith(variant['sha256'][:16]))
                self.assertEqual(variant['bytes'], file.stat().st_size)
                self.assertEqual(variant['sha256'], hashlib.sha256(file.read_bytes()).hexdigest())
            repeat = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
            self.assertNotEqual(repeat.returncode, 0)
            self.assertIn('refusing to overwrite', repeat.stderr)


if __name__ == '__main__':
    unittest.main()
