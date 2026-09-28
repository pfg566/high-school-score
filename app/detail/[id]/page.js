'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function DetailPage({ params }) {
  const { id } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingFeature, setEditingFeature] = useState(false);
  const [featureValue, setFeatureValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchDetail() {
    setLoading(true);
    const { data } = await supabase
      .from('school_cuts')
      .select('*, departments(department_name, schools(school_name, region, school_type))')
      .eq('id', id)
      .single();
    setData(data);
    setFeatureValue(data?.feature || '');
    setLoading(false);
  }

  function startEditFeature() {
    setFeatureValue(data.feature || '');
    setEditingFeature(true);
  }

  function cancelEditFeature() {
    setEditingFeature(false);
  }

  async function saveFeature() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('school_cuts')
        .update({ feature: featureValue, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setEditingFeature(false);
      fetchDetail();
    } catch (err) {
      alert('저장 중 오류가 발생했습니다: ' + err.message);
    }
    setSaving(false);
  }

  if (loading) return <div className="card">불러오는 중...</div>;
  if (!data) return <div className="card">데이터를 찾을 수 없어요.</div>;

  const s = data.departments?.schools;

  return (
    <div className="card">
      <h2>{s?.school_name} - {data.departments?.department_name || '학과정보 없음'}</h2>
      <table>
        <tbody>
          <tr><th style={{ width: 120 }}>지역</th><td>{s?.region}</td></tr>
          <tr><th>전기/후기</th><td>{s?.school_type}</td></tr>
          <tr><th>학과</th><td>{data.departments?.department_name || '학과정보 없음'}</td></tr>
          <tr><th>기준년도</th><td>{data.year}</td></tr>
          <tr><th>합격선</th><td>{data.is_below_cutoff ? '미달' : (data.percentage_cut != null ? data.percentage_cut + '%' : '-')}</td></tr>
          <tr><th>기숙사</th><td>{data.dormitory || '-'}</td></tr>
          <tr>
            <th>기타 특징</th>
            <td>
              {editingFeature ? (
                <div>
                  <textarea
                    value={featureValue}
                    onChange={e => setFeatureValue(e.target.value)}
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <button onClick={saveFeature} disabled={saving} style={{ marginRight: 8 }}>
                      {saving ? '저장중...' : '저장'}
                    </button>
                    <button className="secondary" onClick={cancelEditFeature}>취소</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{data.feature || '등록된 특징이 없어요.'}</div>
                  <button className="secondary" onClick={startEditFeature}>특징 수정</button>
                </div>
              )}
            </td>
          </tr>
          <tr><th>최종수정</th><td>{new Date(data.updated_at).toLocaleString('ko-KR')}</td></tr>
        </tbody>
      </table>
      <div style={{ marginTop: 16 }}>
        <a href="/">← 목록으로 돌아가기</a>
      </div>
    </div>
  );
}
