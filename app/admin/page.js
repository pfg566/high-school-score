'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [recSettings, setRecSettings] = useState(null);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [allCuts, setAllCuts] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed]);

  function handleLogin(e) {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError('비밀번호가 틀렸습니다.');
    }
  }

  async function fetchAll() {
    const { data: s } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    setSettings(s);

    const { data: r } = await supabase.from('recommendation_settings').select('*').eq('id', 1).single();
    setRecSettings(r);

    const { data: p } = await supabase
      .from('school_cuts')
      .select('*, departments(department_name, schools(school_name))')
      .eq('status', 'pending');
    setPending(p || []);

    const { data: h } = await supabase
      .from('edit_history')
      .select('*, school_cuts(percentage_cut, departments(department_name, schools(school_name)))')
      .order('changed_at', { ascending: false })
      .limit(50);
    setHistory(h || []);

    const { data: all } = await supabase
      .from('school_cuts')
      .select('*, departments(department_name, schools(school_name, region))')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false });
    setAllCuts(all || []);
  }

  async function toggleApproval() {
    const newValue = !settings.approval_mode;
    const { error } = await supabase.from('site_settings').update({ approval_mode: newValue }).eq('id', 1);
    if (error) {
      setMsg({ type: 'error', text: '오류: ' + error.message });
    } else {
      setSettings({ ...settings, approval_mode: newValue });
      setMsg({ type: 'success', text: '승인 모드가 변경되었습니다.' });
    }
  }

  async function toggleAllowEdit() {
    const newValue = !(settings.allow_public_edit !== false);
    const { error } = await supabase.from('site_settings').update({ allow_public_edit: newValue }).eq('id', 1);
    if (error) {
      setMsg({ type: 'error', text: '오류: ' + error.message });
    } else {
      setSettings({ ...settings, allow_public_edit: newValue });
      setMsg({ type: 'success', text: '공개 수정 권한 설정이 변경되었습니다.' });
    }
  }

  async function saveThresholds() {
    const { error } = await supabase
      .from('recommendation_settings')
      .update({
        stable_threshold: recSettings.stable_threshold,
        moderate_threshold: recSettings.moderate_threshold,
        challenge_threshold: recSettings.challenge_threshold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (error) {
      setMsg({ type: 'error', text: '오류: ' + error.message });
    } else {
      setMsg({ type: 'success', text: '추천 기준값이 저장되었습니다.' });
    }
  }

  async function approveCut(id) {
    const { error } = await supabase.from('school_cuts').update({ status: 'approved' }).eq('id', id);
    if (!error) {
      setMsg({ type: 'success', text: '승인되었습니다.' });
      fetchAll();
    }
  }

  async function rejectCut(id) {
    const { error } = await supabase.from('school_cuts').delete().eq('id', id);
    if (!error) {
      setMsg({ type: 'success', text: '거절(삭제)되었습니다.' });
      fetchAll();
    }
  }

  async function deleteCut(id) {
    if (!confirm('정말 이 항목을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('school_cuts').delete().eq('id', id);
    if (!error) {
      setMsg({ type: 'success', text: '삭제되었습니다.' });
      fetchAll();
    } else {
      setMsg({ type: 'error', text: '삭제 중 오류: ' + error.message });
    }
  }

  async function revertHistory(h) {
    const { error } = await supabase
      .from('school_cuts')
      .update({ percentage_cut: h.old_value, updated_at: new Date().toISOString() })
      .eq('id', h.cut_id);
    if (!error) {
      setMsg({ type: 'success', text: '이전 값으로 되돌렸습니다.' });
      fetchAll();
    }
  }

  if (!authed) {
    return (
      <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h2>관리자 로그인</h2>
        {error && <div className="msg error">{error}</div>}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label>비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit">로그인</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

      <div className="card">
        <h2>승인 모드</h2>
        <p>현재 상태: <strong>{settings?.approval_mode ? '승인 후 게시' : '즉시 게시'}</strong></p>
        <button onClick={toggleApproval}>{settings?.approval_mode ? '즉시 게시로 전환' : '승인 후 게시로 전환'}</button>
      </div>

      <div className="card">
        <h2>공개 수정 권한</h2>
        <p>현재 상태: <strong>{settings?.allow_public_edit !== false ? '누구나 수정 가능' : '수정 비활성화 (관리자만 가능)'}</strong></p>
        <button onClick={toggleAllowEdit}>
          {settings?.allow_public_edit !== false ? '공개 수정 비활성화하기' : '공개 수정 활성화하기'}
        </button>
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          * 삭제 권한은 항상 관리자만 가능합니다.
        </p>
      </div>

      {recSettings && (
        <div className="card">
          <h2>추천 기준값 설정</h2>
          <div className="form-row">
            <div>
              <label>안정권 기준 (이상)</label>
              <input type="number" value={recSettings.stable_threshold}
                onChange={e => setRecSettings({ ...recSettings, stable_threshold: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label>적정권 기준 (이상)</label>
              <input type="number" value={recSettings.moderate_threshold}
                onChange={e => setRecSettings({ ...recSettings, moderate_threshold: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label>도전권 기준 (이상)</label>
              <input type="number" value={recSettings.challenge_threshold}
                onChange={e => setRecSettings({ ...recSettings, challenge_threshold: parseFloat(e.target.value) })} />
            </div>
          </div>
          <button onClick={saveThresholds}>저장</button>
        </div>
      )}

      <div className="card">
        <h2>승인 대기 목록 ({pending.length}건)</h2>
        {pending.length === 0 && <p style={{ color: '#999' }}>대기중인 항목이 없어요.</p>}
        {pending.map(p => (
          <div className="result-item" key={p.id}>
            <div>
              {p.departments?.schools?.school_name} - {p.departments?.department_name} : {p.is_below_cutoff ? '미달' : (p.percentage_cut + '%')}
            </div>
            <div>
              <button onClick={() => approveCut(p.id)}>승인</button>{' '}
              <button className="danger" onClick={() => rejectCut(p.id)}>거절</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>전체 데이터 관리 ({allCuts.length}건)</h2>
        <p style={{ fontSize: 12, color: '#888' }}>여기서 삭제하면 즉시 목록에서 사라집니다.</p>
        <table>
          <thead>
            <tr>
              <th>지역</th><th>학교</th><th>학과</th><th>연도</th><th>합격선</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {allCuts.map(c => (
              <tr key={c.id}>
                <td>{c.departments?.schools?.region}</td>
                <td>{c.departments?.schools?.school_name}</td>
                <td>{c.departments?.department_name || '학과정보 없음'}</td>
                <td>{c.year}</td>
                <td>{c.is_below_cutoff ? '미달' : (c.percentage_cut != null ? c.percentage_cut + '%' : '-')}</td>
                <td><button className="danger" onClick={() => deleteCut(c.id)}>삭제</button></td>
              </tr>
            ))}
            {allCuts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>데이터가 없어요.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>수정 기록</h2>
        {history.length === 0 && <p style={{ color: '#999' }}>기록이 없어요.</p>}
        {history.map(h => (
          <div className="result-item" key={h.id}>
            <div>
              {h.school_cuts?.departments?.schools?.school_name} - {h.school_cuts?.departments?.department_name} :{' '}
              {h.old_value}% → {h.new_value}%
              <div style={{ fontSize: 12, color: '#888' }}>{new Date(h.changed_at).toLocaleString('ko-KR')}</div>
            </div>
            <button className="secondary" onClick={() => revertHistory(h)}>되돌리기</button>
          </div>
        ))}
      </div>
    </div>
  );
}
