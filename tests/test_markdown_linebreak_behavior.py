import subprocess
import tempfile
import unittest
from pathlib import Path


class MarkdownLinebreakBehaviorTests(unittest.TestCase):
    def test_single_newlines_render_as_html_breaks(self):
        repo_root = Path(__file__).resolve().parents[1]
        source_config = (repo_root / 'hugo.yaml').read_text(encoding='utf-8')
        hard_wraps_enabled = 'hardWraps: true' in source_config

        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / 'content' / 'post' / 'linebreak-test').mkdir(parents=True)
            (site / 'layouts' / '_default').mkdir(parents=True)

            hard_wraps_block = '      hardWraps: true\n' if hard_wraps_enabled else ''
            (site / 'hugo.yaml').write_text(
                (
                    'baseurl: https://example.com/\n'
                    'title: linebreak-test\n'
                    'disableKinds:\n'
                    '  - taxonomy\n'
                    '  - term\n'
                    '  - rss\n'
                    '  - sitemap\n'
                    'markup:\n'
                    '  goldmark:\n'
                    '    renderer:\n'
                    f'{hard_wraps_block}'
                    '      unsafe: true\n'
                ),
                encoding='utf-8',
            )
            (site / 'layouts' / '_default' / 'single.html').write_text('{{ .Content }}', encoding='utf-8')
            (site / 'content' / 'post' / 'linebreak-test' / 'index.md').write_text(
                '---\ntitle: linebreak-test\n---\n第一行\n第二行\n',
                encoding='utf-8',
            )

            subprocess.run(
                ['hugo'],
                cwd=site,
                check=True,
                capture_output=True,
                text=True,
            )

            html = (site / 'public' / 'post' / 'linebreak-test' / 'index.html').read_text(encoding='utf-8')
            self.assertIn('<br>', html)


if __name__ == '__main__':
    unittest.main()
