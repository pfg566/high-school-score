'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const REGIONS = ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'];

export default function Home() {
  const [tab, setTab] = useState('recommend');
  const [percentage, setPercentage] = useState('');
  const [recType, setRecType] = useState('');
  const [recResult, setRecResult] = useState(null);
  const [recSettings, setRecSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const [listRegion, setListRegion] = useState('');
  const [listSchool, setListSchool] = useState('');
  const [listType, setListType] = useState('');
  const [listData, setListData] = useState([]);
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    fetchSchools();
    fetchRecSettings();
  }, []);

  useEffect(() => {
    if (tab === 'list') fetchList();
  }, [tab, listRegion, listSchool, listType]);

  async function fetchSchools() {
    const { data } = await supabase.from('schools').select('id, school_name, region').order('school_name');
    if (data) setSchools(data);
  }

  async function fetchRecSettings() {
    const { data } = await supabase.from('recommendation_settings').select('*').eq('id', 1).single();
    if (data) setRecSettings(data);
  }

  async function fetchList() {
    const { data } = await supabase
      .from('school_cuts')
      .select('*, departments(department_name, schools(school_name, region, school_type))')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false });

    let filtered = data || [];
    if (listRegion) filtered = filtered.filter(r => r.departments?.schools?.region === listRegion);
    if (listSchool) filtered = filtered.filter(r => r.departments?.schools?.school_name?.includes(listSchool));
    if (listType) filtered = filtered.filter(r => r.departments?.schools?.school_type === listType);

    setListData(filtered);
  }

  async function handleRecommend() {
    if (!percentage) { alert('성적을 입력해주세요.'); return; }
    setLoading(true);
    const p = parseFloat(percentage);
    const { data, error } = await supabase
      .from('school_cuts')
      .select('*, departments(department_name, schools(school_name, region, school_type))')
      .eq('status', 'approved');
    setLoading(false);

    if (error) { alert('오류: ' + error.message); return; }

    let filtered = data || [];
    if (recType) filtered = filtered.filter(r => r.departments?.schools?.school_type === recType);

    const stable = recSettings?.stable_threshold ?? 10;
    const moderate = recSettings?.moderate_threshold ?? -3;
    const challenge = recSettings?.challenge_threshold ?? -10;

    const groups = { stable: [], moderate: [], challenge: [] };
    filtered.forEach(r => {
      const diff = r.percentage_cut - p;
      const item = { ...r, diff };
      if (diff >= stable) groups.stable.push(item);
      else if (diff >= moderate) groups.moderate.push(item);
      else if (diff >= challenge) groups.challenge.push(item);
    });

    groups.stable.sort((a, b) => a.diff - b.diff);
    groups.moderate.sort((a, b) => a.diff - b.diff);
    groups.challenge.sort((a, b) => a.diff - b.diff);

    setRecResult(groups);
  }

  return (
    <div>
      <div className="tabs">
        <button className={tab === 'recommend' ? 'active' : ''} onClick={() => setTab('recommend')}>내 성적으로 추천받기</button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>전체 목록</button>
      </div>

      {tab === 'recommend' && (
        <div>
          <div className="card">
            <h2>내 성적으로 학교 추천받기</h2>
            <div className="form-row">
              <div>
                <label>내 백분율 성적 (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="예: 55" />
              </div>
              <div>
                <label>구분</label>
                <select value={recType} onChange={e => setRecType(e.target.value)}>
                  <option value="">전체</option>
                  <option value="전기고">전기고</option>
                  <option value="후기고">후기고</option>
                </select>
              </div>
            </div>
            <button onClick={handleRecommend} disabled={loading}>{loading ? '조회중...' : '추천 결과 보기'}</button>
          </div>

          {recResult && (
            <div>
              <div className="result-group">
                <h3><span className="badge stable">안정권</span></h3>
                {recResult.stable.length === 0 && <p style={{ color: '#999' }}>해당하는 학교가 없어요.</p>}
                {recResult.stable.map(r => (
                  <div className="result-item" key={r.id}>
                    <div>
                      {r.departments?.schools?.school_name} - {r.departments?.department_name}
                      <div style={{ fontSize: 12, color: '#888' }}>합격선 {r.percentage_cut}% (여유 {r.diff.toFixed(1)}p) · 🏠 기숙사 {r.dormitory || '정보없음'}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="result-group">
                <h3><span className="badge moderate">적정권</span></h3>
                {recResult.moderate.length === 0 && <p style={{ color: '#999' }}>해당하는 학교가 없어요.</p>}
                {recResult.moderate.map(r => (
                  <div className="result-item" key={r.id}>
                    <div>
                      {r.departments?.schools?.school_name} - {r.departments?.department_name}
                      <div style={{ fontSize: 12, color: '#888' }}>합격선 {r.percentage_cut}% (여유 {r.diff.toFixed(1)}p) · 🏠 기숙사 {r.dormitory || '정보없음'}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="result-group">
                <h3><span className="badge challenge">도전권</span></h3>
                {recResult.challenge.length === 0 && <p style={{ color: '#999' }}>해당하는 학교가 없어요.</p>}
                {recResult.challenge.map(r => (
                  <div className="result-item" key={r.id}>
                    <div>
                      {r.departments?.schools?.school_name} - {r.departments?.department_name}
                      <div style={{ fontSize: 12, color: '#888' }}>합격선 {r.percentage_cut}% (여유 {r.diff.toFixed(1)}p) · 🏠 기숙사 {r.dormitory || '정보없음'}</div>
                    </div>
                  </div>
                ))}
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
              <select value={listRegion} onChange={e => setListRegion(e.target.value)}>
                <option value="">전체</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label>학교 검색</label>
              <input
                list="school-search-list"
                value={listSchool}
                onChange={e => setListSchool(e.target.value)}
                placeholder="학교명을 입력하세요 (예: 전주)"
              />
              <datalist id="school-search-list">
                {schools.map(s => <option key={s.id} value={s.school_name} />)}
              </datalist>
            </div>
            <div>
              <label>전기/후기</label>
              <select value={listType} onChange={e => setListType(e.target.value)}>
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
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999' }}>데이터가 없어요.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
