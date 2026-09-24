'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const REGIONS = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];

export default function Home() {
  const [tab, setTab] = useState('recommend');

  // 추천 관련 state
  const [score, setScore] = useState('');
  const [region, setRegion] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [schools, setSchools] = useState([]);
  const [settings, setSettings] = useState({ stable_threshold: 10, moderate_threshold: -3, challenge_threshold: -10 });
  const [recommendResult, setRecommendResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // 전체 목록 관련 state
  const [listData, setListData] = useState([]);
  const [listRegion, setListRegion] = useState('');
  const [listSchool, setListSchool] = useState('');
  const [listType, setListType] = useState('');

  useEffect(() => {
    loadSchools();
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === 'list') loadList();
  }, [tab, listRegion, listSchool, listType]);

  async function loadSchools() {
    const { data } = await supabase.from('schools').select('*').order('school_name');
    setSchools(data || []);
  }

  async function loadSettings() {
    const { data } = await supabase.from('recommendation_settings').select('*').eq('id', 1).single();
    if (data) setSettings(data);
  }

  async function loadList() {
    let query = supabase
      .from('school_cuts')
      .select('*, departments(department_name, schools(school_name, region, school_type))')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false });

    const { data } = await query;
    let rows = data || [];

    rows = rows.filter(r => {
      const s = r.departments?.schools;
      if (!s) return false;
      if (listRegion && s.region !== listRegion) return false;
      if (listSchool && s.school_name !== listSchool) return false;
      if (listType && s.school_type !== listType) return false;
      return true;
    });

    setListData(rows);
  }

  async function handleRecommend() {
    if (!score) { alert('내 백분율 성적을 입력해주세요.'); return; }
    setLoading(true);

    const { data } = await supabase
      .from('school_cuts')
      .select('*, departments(department_name, schools(school_name, region, school_type))')
      .eq('status', 'approved');

    let rows = data || [];
    const p = parseFloat(score);

    rows = rows.filter(r => {
      const s = r.departments?.schools;
      if (!s) return false;
      if (region && s.region !== region) return false;
      if (schoolFilter && s.school_name !== schoolFilter) return false;
      return true;
    });

    const stable = [], moderate = [], challenge = [];
    rows.forEach(r => {
      const diff = r.percentage_cut - p;
      if (diff >= settings.stable_threshold) stable.push({ ...r, diff });
      else if (diff >= settings.moderate_threshold) moderate.push({ ...r, diff });
      else if (diff >= settings.challenge_threshold) challenge.push({ ...r, diff });
    });

    stable.sort((a,b) => a.diff - b.diff);
    moderate.sort((a,b) => a.diff - b.diff);
    challenge.sort((a,b) => a.diff - b.diff);

    setRecommendResult({ stable, moderate, challenge });
    setLoading(false);
  }

  function renderResultItem(r) {
    const s = r.departments?.schools;
    return (
      <div className="result-item" key={r.id}>
        <div>
          <strong>{s?.school_name}</strong> - {r.departments?.department_name}
          <div style={{fontSize:12, color:'#666'}}>
            합격선 {r.percentage_cut}% · 여유 {r.diff > 0 ? '+' : ''}{r.diff.toFixed(1)}p
          </div>
        </div>
        <div style={{fontSize:13}}>
          🏠 {r.dormitory || '정보없음'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="tabs">
        <button className={tab==='recommend'?'active':''} onClick={()=>setTab('recommend')}>내 성적으로 학교 찾기</button>
        <button className={tab==='list'?'active':''} onClick={()=>setTab('list')}>전체 목록 보기</button>
      </div>

      {tab === 'recommend' && (
        <div className="card">
          <h2>내 성적으로 학교 추천받기</h2>
          <div className="form-row">
            <div>
              <label>내 백분율 성적 (%)</label>
              <input type="number" step="0.1" value={score} onChange={e=>setScore(e.target.value)} placeholder="예: 55" />
            </div>
            <div>
              <label>지역</label>
              <select value={region} onChange={e=>setRegion(e.target.value)}>
                <option value="">전체</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label>학교</label>
              <select value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)}>
                <option value="">전체</option>
                {schools.map(s => <option key={s.id} value={s.school_name}>{s.school_name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleRecommend} disabled={loading}>{loading ? '검색중...' : '추천 결과 보기'}</button>

          {recommendResult && (
            <div style={{marginTop:24}}>
              <div className="result-group">
                <h3><span className="badge stable">안정권</span></h3>
                {recommendResult.stable.length === 0 && <p style={{color:'#999'}}>해당하는 학교가 없어요.</p>}
                {recommendResult.stable.map(renderResultItem)}
              </div>
              <div className="result-group">
                <h3><span className="badge moderate">적정권</span></h3>
                {recommendResult.moderate.length === 0 && <p style={{color:'#999'}}>해당하는 학교가 없어요.</p>}
                {recommendResult.moderate.map(renderResultItem)}
              </div>
              <div className="result-group">
                <h3><span className="badge challenge">소신/도전권</span></h3>
                {recommendResult.challenge.length === 0 && <p style={{color:'#999'}}>해당하는 학교가 없어요.</p>}
                {recommendResult.challenge.map(renderResultItem)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div className="card">
          <h2>전체 목록</h2>
          <div className="form-row">
            <div>
              <label>지역</label>
              <select value={listRegion} onChange={e=>setListRegion(e.target.value)}>
                <option value="">전체</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label>학교</label>
              <select value={listSchool} onChange={e=>setListSchool(e.target.value)}>
                <option value="">전체</option>
                {schools.map(s => <option key={s.id} value={s.school_name}>{s.school_name}</option>)}
              </select>
            </div>
            <div>
              <label>전기/후기</label>
              <select value={listType} onChange={e=>setListType(e.target.value)}>
                <option value="">전체</option>
                <option value="전기고">전기고</option>
                <option value="후기고">후기고</option>
              </select>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>지역</th><th>학교</th><th>학과</th><th>연도</th><th>합격선</th><th>기숙사</th><th>특징</th><th>최종수정</th>
              </tr>
            </thead>
            <tbody>
              {listData.map(r => {
                const s = r.departments?.schools;
                return (
                  <tr key={r.id}>
                    <td>{s?.region}</td>
                    <td>{s?.school_name}</td>
                    <td>{r.departments?.department_name}</td>
                    <td>{r.year}</td>
                    <td>{r.percentage_cut}%</td>
                    <td>{r.dormitory || '-'}</td>
                    <td>{r.feature || '-'}</td>
                    <td>{new Date(r.updated_at).toLocaleString('ko-KR')}</td>
                  </tr>
                );
              })}
              {listData.length === 0 && (
                <tr><td colSpan={8} style={{textAlign:'center', color:'#999'}}>데이터가 없어요.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
