'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const REGIONS = ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'];

export default function SubmitPage() {
  const [form, setForm] = useState({
    region: '전주시',
    school_type: '전기고',
    school_name: '',
    department_name: '',
    year: new Date().getFullYear(),
    percentage_cut: '',
    is_below_cutoff: false,
    dormitory: '없음',
    feature: '',
  });
  const [schoolNames, setSchoolNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchSchoolNames();
  }, []);

  async function fetchSchoolNames() {
    const { data } = await supabase.from('schools').select('school_name');
    if (data) setSchoolNames([...new Set(data.map(s => s.school_name))]);
  }

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleBelowCutoffChange(checked) {
    setForm(prev => ({
      ...prev,
      is_below_cutoff: checked,
      percentage_cut: checked ? '' : prev.percentage_cut,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (!form.school_name) {
      setMsg({ type: 'error', text: '고등학교명을 입력해주세요.' });
      return;
    }
    if (!form.is_below_cutoff && !form.percentage_cut) {
      setMsg({ type: 'error', text: '합격선을 입력하거나 "미달"에 체크해주세요.' });
      return;
    }

    setLoading(true);
    try {
      let { data: existingSchool } = await supabase
        .from('schools')
        .select('id')
        .eq('school_name', form.school_name)
        .maybeSingle();

      let schoolId;
      if (existingSchool) {
        schoolId = existingSchool.id;
      } else {
        const { data: newSchool, error: schoolError } = await supabase
          .from('schools')
          .insert({ region: form.region, school_type: form.school_type, school_name: form.school_name })
          .select('id')
          .single();
        if (schoolError) throw schoolError;
        schoolId = newSchool.id;
      }

      const departmentName = form.department_name.trim() || '학과정보 없음';

      let { data: existingDept } = await supabase
        .from('departments')
        .select('id')
        .eq('school_id', schoolId)
        .eq('department_name', departmentName)
        .maybeSingle();

      let deptId;
      if (existingDept) {
        deptId = existingDept.id;
      } else {
        const { data: newDept, error: deptError } = await supabase
          .from('departments')
          .insert({ school_id: schoolId, department_name: departmentName })
          .select('id')
          .single();
        if (deptError) throw deptError;
        deptId = newDept.id;
      }

      const { data: settings } = await supabase
        .from('site_settings')
        .select('approval_mode')
        .eq('id', 1)
        .single();
      const approvalMode = settings?.approval_mode ?? false;

      let { data: existingCut } = await supabase
        .from('school_cuts')
        .select('*')
        .eq('department_id', deptId)
        .eq('year', form.year)
        .maybeSingle();

      const newValue = form.is_below_cutoff ? null : parseFloat(form.percentage_cut);

      if (existingCut) {
        const { error: updateError } = await supabase
          .from('school_cuts')
          .update({
            percentage_cut: newValue,
            is_below_cutoff: form.is_below_cutoff,
            dormitory: form.dormitory,
            feature: form.feature,
            status: approvalMode ? 'pending' : 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCut.id);
        if (updateError) throw updateError;

        await supabase.from('edit_history').insert({
          cut_id: existingCut.id,
          old_value: existingCut.percentage_cut,
          new_value: newValue,
        });
      } else {
        const { error: insertError } = await supabase
          .from('school_cuts')
          .insert({
            department_id: deptId,
            year: form.year,
            percentage_cut: newValue,
            is_below_cutoff: form.is_below_cutoff,
            dormitory: form.dormitory,
            feature: form.feature,
            status: approvalMode ? 'pending' : 'approved',
          });
        if (insertError) throw insertError;
      }

      setMsg({ type: 'success', text: approvalMode ? '제보가 승인 대기 중입니다. 감사합니다!' : '제보가 반영되었습니다. 감사합니다!' });
      setForm(prev => ({ ...prev, department_name: '', percentage_cut: '', is_below_cutoff: false, feature: '' }));
      fetchSchoolNames();
    } catch (err) {
      setMsg({ type: 'error', text: '오류가 발생했습니다: ' + err.message });
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <h2>정보 제보하기</h2>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label>지역</label>
            <select value={form.region} onChange={e => update('region', e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label>전기고/후기고</label>
            <select value={form.school_type} onChange={e => update('school_type', e.target.value)}>
              <option value="전기고">전기고</option>
              <option value="후기고">후기고</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div>
            <label>고등학교명</label>
            <input list="school-list" value={form.school_name} onChange={e => update('school_name', e.target.value)} placeholder="학교명 입력 (없으면 새로 추가돼요)" />
            <datalist id="school-list">
              {schoolNames.map(name => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div>
            <label>학과 (선택사항)</label>
            <input value={form.department_name} onChange={e => update('department_name', e.target.value)} placeholder="비워두면 '학과정보 없음'으로 표시돼요" />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label>기준년도</label>
            <input type="number" value={form.year} onChange={e => update('year', e.target.value)} />
          </div>
          <div>
            <label>합격선 (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.percentage_cut}
              onChange={e => update('percentage_cut', e.target.value)}
              placeholder="예: 61"
              disabled={form.is_below_cutoff}
            />
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                id="below-cutoff"
                checked={form.is_below_cutoff}
                onChange={e => handleBelowCutoffChange(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="below-cutoff" style={{ margin: 0, fontSize: 13 }}>미달</label>
            </div>
          </div>
          <div>
            <label>기숙사</label>
            <select value={form.dormitory} onChange={e => update('dormitory', e.target.value)}>
              <option value="있음">있음</option>
              <option value="없음">없음</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div>
            <label>기타 특징</label>
            <input value={form.feature} onChange={e => update('feature', e.target.value)} placeholder="선택사항" />
          </div>
        </div>
        <button type="submit" disabled={loading}>{loading ? '제출중...' : '제보 제출하기'}</button>
      </form>
    </div>
  );
}
