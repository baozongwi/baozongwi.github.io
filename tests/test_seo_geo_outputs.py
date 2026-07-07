import json
import re
import subprocess
import unittest
from pathlib import Path


class SeoGeoOutputTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo_root = Path(__file__).resolve().parents[1]
        subprocess.run(
            ["hugo", "--minify", "--buildFuture", "--cleanDestinationDir"],
            cwd=cls.repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
        cls.public_dir = cls.repo_root / "public"
        cls.home_html = (cls.public_dir / "index.html").read_text(encoding="utf-8")
        cls.article_html = (
            cls.public_dir / "p" / "ctfshow-yii" / "index.html"
        ).read_text(encoding="utf-8")
        cls.encrypted_article_html = (
            cls.public_dir / "p" / "encrypt-feature" / "index.html"
        ).read_text(encoding="utf-8")
        cls.index_json = json.loads((cls.public_dir / "index.json").read_text(encoding="utf-8"))
        cls.post_feed = (cls.public_dir / "post" / "index.xml").read_text(encoding="utf-8")

    def test_home_page_has_open_graph_twitter_and_website_schema(self):
        self.assertIn('property="og:title"', self.home_html)
        self.assertIn('property="og:type"', self.home_html)
        self.assertRegex(self.home_html, r'name=?["\']?twitter:card["\']?')
        self.assertRegex(self.home_html, r'"@type"\s*:\s*"WebSite"')

    def test_article_page_uses_content_fallback_description_and_blogposting_schema(self):
        self.assertNotIn(
            'content="Currently exploring Java security and internal network penetration, with CTFs as a hobby."',
            self.article_html,
        )
        self.assertIn('property="og:title"', self.article_html)
        self.assertRegex(self.article_html, r'name=?["\']?twitter:card["\']?')
        self.assertRegex(self.article_html, r'"@type"\s*:\s*"BlogPosting"')
        self.assertRegex(self.article_html, r'"@type"\s*:\s*"BreadcrumbList"')

    def test_encrypted_article_is_marked_noindex(self):
        self.assertRegex(
            self.encrypted_article_html,
            r'<meta\s+name=?["\']?robots["\']?\s+content=?["\'][^"\']*noindex[^"\']*["\']',
        )

    def test_index_json_has_machine_readable_fields_and_excludes_encrypted_posts(self):
        self.assertTrue(self.index_json, "index.json should not be empty")
        first = self.index_json[0]
        self.assertIn("description", first)
        self.assertIn("summary", first)
        self.assertIn("author", first)
        self.assertIn("lastmod", first)
        self.assertIsInstance(first.get("tags"), list)
        self.assertIsInstance(first.get("categories"), list)
        self.assertFalse(
            any(item.get("permalink") == "/p/encrypt-feature/" for item in self.index_json),
            "Encrypted/private post should not appear in machine-readable search index",
        )

    def test_robots_and_llms_exist(self):
        robots = self.public_dir / "robots.txt"
        llms = self.public_dir / "llms.txt"
        self.assertTrue(robots.exists(), "robots.txt should be generated")
        self.assertTrue(llms.exists(), "llms.txt should be generated")
        self.assertIn("Sitemap:", robots.read_text(encoding="utf-8"))
        self.assertIn("/llms.txt", robots.read_text(encoding="utf-8"))
        self.assertIn("# baozongwi's blog", llms.read_text(encoding="utf-8"))

    def test_feed_excludes_encrypted_posts(self):
        self.assertNotIn("https://baozongwi.xyz/p/encrypt-feature/", self.post_feed)


if __name__ == "__main__":
    unittest.main()
