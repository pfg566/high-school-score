'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const REGIONS = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];

export default function Submit() {
  const [form, setForm] = useState({
    region: '서울',
    school_type: '전기고',
    school_name: '',
    department_name: '',
    year: new Date().getFullYear(),
    percentage_cut: '',
    dormitory: '없음',
    feature: '',
  });
  const [schools, setSchools] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('schools').select('*').then(({ data }) => setSchools(data || []));
  }, []);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.school_name || !form.department_name || !form.percentage_cut) {
      setMsg({ type: 'error', text: '필수 항목을 모두 입력해주세요.' });
      return;
    }
    setLoading(true);
    setMsg(null);

    try {
      // 1. 학교 찾기 또는 생성
      let { data: existingSchool } = await supabase
        .from('schools')
        .select('*')
        .eq('region', form.region)
        .eq('school_type', form.school_type)
        .eq('school_name', form.school_name)
        .maybeSingle();

      let schoolId = existingSchool?.id;
      if (!schoolId) {
        const { data: newSchool, error } = await supabase
          .from('schools')
          .insert({ region: form.region, school_type: form.school_type, school_name: form.school_name })
          .select()
          .single();
        if (error) throw error;
        schoolId = newSchool.id;
      }

      // 2. 학과 찾기 또는 생성
      let { data: existingDept } = await supabase
        .from('departments')
        .select('*')
        .eq('school_id', schoolId)
        .eq('department_name', form.department_name)
        .maybeSingle();

      let deptId = existingDept?.id;
      if (!deptId) {
        const { data: newDept, error } = await supabase
          .from('departments')
          .insert({ school_id: schoolId, department_name: form.department_name })
          .select()
          .single();
        if (error) throw error;
        deptId = newDept.id;
      }

      // 3. 승인모드 확인
      const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      const status = settings?.approval_mode ? 'pending' : 'approved';

      // 4. 기존 합격선 데이터 있는지 확인 (같은 학과 + 같은 연도)
      const { data: existingCut } = await supabase
        .from('school_cuts')
        .select('*')
        .eq('department_id', deptId)
        .eq('year', form.year)
        .maybeSingle();

      if (existingCut) {
        // 기록 저장
        await supabase.from('edit_history').insert({
          cut_id: existingCut.id,
          old_value: existingCut.percentage_cut,
          new_value: parseFloat(form.percentage_cut),
        });
        // 덮어쓰기
        const { error } = await supabase
          .from('school_cuts')
          .update({
            percentage_cut: parseFloat(form.percentage_cut),
            dormitory: form.dormitory,
            feature: form.feature,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCut.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('school_cuts').insert({
          department_id: deptId,
          year: form.year,
          percentage_cut: parseFloat(form.percentage_cut),
          dormitory: form.dormitory,
          feature: form.feature,
          status,
        });
        if (error) throw error;
      }

      setMsg({ type: 'success', text: status === 'pending' ? '제출되었습니다! 관리자 승인 후 게시됩니다.' : '제출되었습니다! 바로 반영되었어요.' });
      setForm(prev => ({ ...prev, department_name: '', percentage_cut: '', feature: '' }));
    } catch (err) {
      setMsg({ type: 'error', text: '오류가 발생했어요: ' + err.message });
    }
    setLoading(false);
  }

  const schoolNames = [...new Set(schools.map(s => s.school_name))];

  return (
    <div className="card">
      <h2>정보 제보하기</h2>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label>지역</label>
            <select value={form.region} onChange={e=>update('region', e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label>전기고/후기고</label>
            <select value={form.school_type} onChange={e=>update('school_type', e.target.value)}>
              <option value="전기고">전기고</option>
              <option value="후기고">후기고</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div>
            <label>고등학교명</label>
            <input list="school-list" value={form.school_name} onChange={e=>update('school_name', e.target.value)} placeholder="학교명 입력 (없으면 새로 추가돼요)" />
            <datalist id="school-list">
              {schoolNames.map(name => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div>
            <label>학과</label>
            <input value={form.department_name} onChange={e=>update('department_name', e.target.value)} placeholder="예: 인문, 자연, 디자인과 등" />
          </div>
        </div>

        <div className="form-row">
          <div>
            <label>기준년도</label>
            <input type="number" value={form.year} onChange={e=>update('year', e.target.value)} />
          </div>
          <div>
            <label>합격선 (%) - 숫자가 낮을수록 우수</label>
            <input type="number" step="0.1" min="0" max="100" value={form.percentage_cut} onChange={e=>update('percentage_cut', e.target.value)} placeholder="예: 61" />
          </div>
          <div>
            <label>기숙사</label>
            <select value={form.dormitory} onChange={e=>update('dormitory', e.target.value)}>
              <option value="있음">있음</option>
              <option value="없음">없음</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div>
            <label>기타 특징</label>
            <input value={form.feature} onChange={e=>update('feature', e.target.value)} placeholder="선택사항" />
          </div>
        </div>

        <button type="submit" disabled={loading}>{loading ? '제출중...' : '제보 제출하기'}</button>
      </form>
    </div>
  );
}
