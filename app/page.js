'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  const [siteSettings, setSiteSettings] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
    fetchRecSettings();
    fetchSiteSettings();
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

  async function fetchSiteSettings() {
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    if (data) setSiteSettings(data);
  }

  async function fetchList() {
    const { data } = await supabase
      .from('school_cuts')
      .select('*, departments(id, department_name, schools(school_name, region, school_type))')
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

    const stableTh = recSettings?.stable_threshold ?? 10;
    const moderateTh = recSettings?.moderate_threshold ?? -3;
    const challengeTh = recSettings?.challenge_threshold ?? -10;

    const groups = { stable: [], moderate: [], challenge: [] };

    filtered.forEach(r => {
      // 미달 표시된 학교는 항상 안정권에 포함 (합격선 계산 없이)
      if (r.is_below_cutoff) {
        groups.stable.push({ ...r, diff: Infinity });
        return;
      }
      if (r.percentage_cut === null || r.percentage_cut === undefined) return;
      const diff = r.percentage_cut - p;
      const item = { ...r, diff };
      if (diff >= stableTh) groups.stable.push(item);
      else if (diff >= moderateTh) groups.moderate.push(item);
      else if (diff >= challengeTh) groups.challenge.push(item);
    });

    groups.stable.sort((a, b) => a.diff - b.diff);
    groups.moderate.sort((a, b) => a.diff - b.diff);
    groups.challenge.sort((a, b) => a.diff - b.diff);

    setRecResult(groups);
  }

  function renderResultItem(r) {
    return (
      <div className="result-item" key={r.id}>
        <div>
          {r.departments?.schools?.school_name} - {r.departments?.department_name || '학과정보 없음'}
          {r.is_below_cutoff ? (
            <>
              {' '}
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, color: 'white', background: '#6b7280' }}>미달</span>
              <div style={{ fontSize: 12, color: '#888' }}>🏠 기숙사 {r.dormitory || '정보없음'}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#888' }}>합격선 {r.percentage_cut}% (여유 {r.diff.toFixed(1)}p) · 🏠 기숙사 {r.dormitory || '정보없음'}</div>
          )}
        </div>
      </div>
    );
  }

  // ---- 전체 목록 수정 관련 ----
  function startEdit(r) {
    setEditingId(r.id);
    setEditForm({
      department_name: (r.departments?.department_name === '학과정보 없음') ? '' : (r.departments?.department_name || ''),
      department_id: r.departments?.id,
      year: r.year,
      percentage_cut: r.percentage_cut ?? '',
      is_below_cutoff: r.is_below_cutoff || false,
      dormitory: r.dormitory || '없음',
      feature: r.feature || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function updateEditForm(key, value) {
    setEditForm(prev => ({ ...prev, [key]: value }));
  }

  function handleEditBelowCutoff(checked) {
    setEditForm(prev => ({ ...prev, is_below_cutoff: checked, percentage_cut: checked ? '' : prev.percentage_cut }));
  }

  async function saveEdit(r) {
    if (!editForm.is_below_cutoff && !editForm.percentage_cut) {
      alert('합격선을 입력하거나 "미달"에 체크해주세요.');
      return;
    }
    setEditSaving(true);
    try {
      const deptName = editForm.department_name.trim() || '학과정보 없음';
      if (editForm.department_id && deptName !== r.departments?.department_name) {
        await supabase.from('departments').update({ department_name: deptName }).eq('id', editForm.department_id);
      }

      const { data: settingsData } = await supabase.from('site_settings').select('approval_mode').eq('id', 1).single();
      const approvalMode = settingsData?.approval_mode ?? false;

      const newValue = editForm.is_below_cutoff ? null : parseFloat(editForm.percentage_cut);

      const { error } = await supabase
        .from('school_cuts')
        .update({
          year: editForm.year,
          percentage_cut: newValue,
          is_below_cutoff: editForm.is_below_cutoff,
          dormitory: editForm.dormitory,
          feature: editForm.feature,
          status: approvalMode ? 'pending' : 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id);

      if (error) throw error;

      if (r.percentage_cut !== newValue) {
        await supabase.from('edit_history').insert({
          cut_id: r.id,
          old_value: r.percentage_cut,
          new_value: newValue,
        });
      }

      setEditingId(null);
      setEditForm(null);
      fetchList();
    } catch (err) {
      alert('수정 중 오류가 발생했습니다: ' + err.message);
    }
    setEditSaving(false);
  }

  const canEdit = siteSettings ? siteSettings.allow_public_edit !== false : true;

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
                {recResult.stable.map(r => renderResultItem(r))}
              </div>
              <div className="result-group">
                <h3><span className="badge moderate">적정권</span></h3>
                {recResult.moderate.length === 0 && <p style={{ color: '#999' }}>해당하는 학교가 없어요.</p>}
                {recResult.moderate.map(r => renderResultItem(r))}
              </div>
              <div className="result-group">
                <h3><span className="badge challenge">도전권</span></h3>
                {recResult.challenge.length === 0 && <p style={{ color: '#999' }}>해당하는 학교가 없어요.</p>}
                {recResult.challenge.map(r => renderResultItem(r))}
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
              <label><strong>학교 검색</strong></label>
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
              <label>지역</label>
              <select value={listRegion} onChange={e => setListRegion(e.target.value)}>
                <option value="">전체</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
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
                {canEdit && <th>관리</th>}
              </tr>
            </thead>
            <tbody>
              {listData.map(r => {
                const s = r.departments?.schools;
                const isEditing = editingId === r.id;

                if (isEditing) {
                  return (
                    <tr key={r.id}>
                      <td>{s?.region}</td>
                      <td>{s?.school_name}</td>
                      <td>
                        <input
                          value={editForm.department_name}
                          onChange={e => updateEditForm('department_name', e.target.value)}
                          placeholder="학과정보 없음"
                          style={{ minWidth: 100 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editForm.year}
                          onChange={e => updateEditForm('year', e.target.value)}
                          style={{ width: 70 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={editForm.percentage_cut}
                          onChange={e => updateEditForm('percentage_cut', e.target.value)}
                          disabled={editForm.is_below_cutoff}
                          style={{ width: 70 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <input
                            type="checkbox"
                            checked={editForm.is_below_cutoff}
                            onChange={e => handleEditBelowCutoff(e.target.checked)}
                            style={{ width: 'auto' }}
                          />
                          <span style={{ fontSize: 12 }}>미달</span>
                        </div>
                      </td>
                      <td>
                        <select value={editForm.dormitory} onChange={e => updateEditForm('dormitory', e.target.value)}>
                          <option value="있음">있음</option>
                          <option value="없음">없음</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={editForm.feature}
                          onChange={e => updateEditForm('feature', e.target.value)}
                          style={{ minWidth: 100 }}
                        />
                      </td>
                      <td>{new Date(r.updated_at).toLocaleString('ko-KR')}</td>
                      <td>
                        <button onClick={() => saveEdit(r)} disabled={editSaving} style={{ marginRight: 4 }}>
                          {editSaving ? '저장중...' : '저장'}
                        </button>
                        <button className="secondary" onClick={cancelEdit}>취소</button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={r.id}>
                    <td>{s?.region}</td>
                    <td>{s?.school_name}</td>
                    <td>{r.departments?.department_name || '학과정보 없음'}</td>
                    <td>{r.year}</td>
                    <td>{r.is_below_cutoff ? '미달' : (r.percentage_cut != null ? r.percentage_cut + '%' : '-')}</td>
                    <td>{r.dormitory || '-'}</td>
                    <td>{r.feature || '-'}</td>
                    <td>{new Date(r.updated_at).toLocaleString('ko-KR')}</td>
                    {canEdit && (
                      <td>
                        <button className="secondary" onClick={() => startEdit(r)}>수정</button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {listData.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999' }}>데이터가 없어요.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
