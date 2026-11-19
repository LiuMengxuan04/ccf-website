import unittest, json, tempfile, re
from pathlib import Path
from scripts.refresh_hpdc import parse, refresh, CFP
F = Path(__file__).parent / 'fixtures'
CF = (F / 'hpdc-2027-cfp.html').read_text()
CF_NO_LINK = re.sub(r'<button.*?</button>', '', CF)
HM = (F / 'hpdc-2027-home.html').read_text()
class HPDCTest(unittest.TestCase):
    def test_actual_fixture(self):
        d = parse(CF, HM)
        self.assertEqual(d['dates']['paper'], '2027-01-18')
        self.assertEqual(d['submission']['url'], 'https://hpdc27.hotcrp.com/')
    def test_fail_closed(self):
        for broken in [CF.replace('January 18, 2027', 'January 18, 2026'),
                       CF.replace('AoE', 'UTC'), CF.replace('Abstract registration', 'Abstract TBD'),
                       CF.replace('January 18, 2027', 'January 19, 2027'), '<h1>Service unavailable</h1>']:
            with self.subTest(broken=broken[:30]), self.assertRaises(ValueError): parse(broken, HM)
    def test_untrusted_links(self):
        d = parse(CF_NO_LINK + '<a href="javascript:alert(1)">submit</a><a href="https://hpdc27.hotcrp.com.evil.test/">submit</a>', HM)
        self.assertIsNone(d['submission']['url'])
        d = parse(CF_NO_LINK + '<a href="https://hpdc27.hotcrp.com/">Submit paper</a>', HM)
        self.assertEqual(d['submission']['status'], 'linked')
    def test_button_literal_only(self):
        for onclick in ["parent.open('https://evil.test/')", "parent.open('https://hpdc27.hotcrp.com.evil.test/')",
                        "parent.open('https://hpdc27.hotcrp.com/');alert(1)",
                        "parent.open('https://hpdc27.hotcrp.com/' + suffix)",
                        "window.open('https://hpdc27.hotcrp.com/')", "parent.open(url)"]:
            with self.subTest(onclick=onclick):
                html = CF_NO_LINK + f'<button onclick="{onclick}">HPDC Submission Site</button>'
                self.assertIsNone(parse(html, HM)['submission']['url'])
        html = CF_NO_LINK + "<button onclick=\"parent.open('https://hpdc27.hotcrp.com/');\"><span>HPDC Submission Site</span></button>"
        self.assertEqual(parse(html, HM)['submission']['status'], 'linked')
    def test_last_valid_atomic(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / 'data.json'
            good = refresh(p, lambda u: CF if u == CFP else HM, '2026-11-19T00:00:00+00:00')
            again = refresh(p, lambda u: CF if u == CFP else HM, '2026-11-20T00:00:00+00:00')
            self.assertEqual(good['updated_at'], again['updated_at'])
            def down(_): raise TimeoutError()
            failed = refresh(p, down, '2026-11-21T00:00:00+00:00')
            self.assertEqual(failed['data'], good['data'])
            self.assertEqual(failed['verified_at'], again['verified_at'])
            self.assertEqual(failed['refresh_status'], 'failed')
            self.assertEqual(json.loads(p.read_text()), failed)
    def test_no_snapshot_failure(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'missing.json'
            with self.assertRaises(ValueError): refresh(p, lambda _: '')
            self.assertFalse(p.exists())
if __name__ == '__main__': unittest.main()
