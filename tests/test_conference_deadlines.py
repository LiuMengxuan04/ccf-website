import importlib.util, pathlib, unittest, copy
spec=importlib.util.spec_from_file_location('deadlines',pathlib.Path(__file__).resolve().parents[1]/'scripts/refresh_conference_deadlines.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CommunityTest(unittest.TestCase):
    def setUp(self): self.data=m.json.loads(m.OUT.read_text())
    def test_snapshot(self):m.validate(self.data)
    def test_no_official_claim(self):
        self.data['conferences'][0]['verified_at']='2026-01-01'
        with self.assertRaises(AssertionError):m.validate(self.data)
    def test_truncated_source(self):
        self.data['conferences']=self.data['conferences'][:3]
        with self.assertRaises(AssertionError):m.validate(self.data)
    def test_multi_round_not_collapsed(self):
        items=[c for c in self.data['conferences'] if len(c['rounds'])>1]
        self.assertTrue(items)
        for c in items:self.assertEqual(c['dates'],{})
    def test_invalid_source_url(self):
        self.data['conferences'][0]['sources']=['javascript:alert(1)']
        with self.assertRaises(AssertionError):m.validate(self.data)
    def test_hpdc_excluded(self):self.assertNotIn('HPDC',[c['acronym'] for c in self.data['conferences']])
