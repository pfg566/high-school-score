'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const REGIONS = [
  '전주시',
  '군산시',
  '익산시',
  '정읍시',
  '남원시',
  '김제시',
  '완주군',
  '진안군',
  '무주군',
  '장수군',
  '임실군',
  '순창군',
  '고창군',
  '부안군'
];

const CURRENT_YEAR = new Date().getFullYear();

function formatYearMonth(dateStr) {
  if (!dateStr) return '정보 없음';

  const d = new Date(dateStr);

  if (Number.isNaN(d.getTime())) {
    return '정보 없음';
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}


function getCutoffDisplayText(row) {
  if (!row) return '정보 없음';
  if (row.is_below_cutoff) return '미달';

  const text = row.cutoff_text?.trim();
  if (text) return text;

  if (row.percentage_cut !== null && row.percentage_cut !== undefined) {
    return `${row.percentage_cut}%`;
  }

  return '정보 없음';
}

function inferGraphValueFromCutoffText(rawText) {
  const text = String(rawText || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!text) return null;

  // 예: 70~80%, 70~80%대, 70 ~ 80
  const rangeMatch = text.match(
    /(\d+(?:\.\d+)?)\s*~\s*(\d+(?:\.\d+)?)\s*%?/
  );

  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);

    if (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min >= 0 &&
      max <= 100 &&
      min <= max
    ) {
      return Number(((min + max) / 2).toFixed(1));
    }
  }

  // 예: 90% 초반대 / 80% 중반 / 70% 후반대
  const bandMatch = text.match(
    /(\d+(?:\.\d+)?)\s*%\s*(초반대?|중반대?|후반대?)/
  );

  if (bandMatch) {
    const base = Number(bandMatch[1]);
    const band = bandMatch[2];
    const add = band.startsWith('초반')
      ? 2
      : band.startsWith('중반')
        ? 5
        : 7;

    const value = base + add;

    if (Number.isFinite(value)) {
      return Math.min(100, value);
    }
  }

  // 예: 90%대 -> 대표값 92
  const decadeMatch = text.match(/(\d+(?:\.\d+)?)\s*%대/);

  if (decadeMatch) {
    const base = Number(decadeMatch[1]);
    const value = base + 2;

    if (Number.isFinite(value)) {
      return Math.min(100, value);
    }
  }

  return null;
}

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
  const [listLoading, setListLoading] = useState(false);

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
    if (tab === 'list') {
      fetchList();
    }
  }, [tab, listRegion, listSchool, listType]);

  async function fetchSchools() {
    const { data, error } = await supabase
      .from('schools')
      .select('id, school_name, region, school_type')
      .order('school_name');

    if (error) {
      console.error('학교 목록 조회 오류:', error);
      return;
    }

    setSchools(data || []);
  }

  async function fetchRecSettings() {
    const { data } = await supabase
      .from('recommendation_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setRecSettings(data);
    }
  }

  async function fetchSiteSettings() {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setSiteSettings(data);
    }
  }

  async function fetchList() {
    setListLoading(true);

    const [
      { data: schoolRows, error: schoolError },
      { data: cutRows, error: cutError }
    ] = await Promise.all([
      supabase
        .from('schools')
        .select('id, school_name, region, school_type')
        .order('school_name'),

      supabase
        .from('school_cuts')
        .select(`
          *,
          departments(
            id,
            department_name,
            schools(
              id,
              school_name,
              region,
              school_type
            )
          )
        `)
        .eq('status', 'approved')
        .order('year', { ascending: false })
        .order('updated_at', { ascending: false })
    ]);

    setListLoading(false);

    if (schoolError) {
      console.error('학교 목록 조회 오류:', schoolError);
      setListData([]);
      return;
    }

    if (cutError) {
      console.error('합격선 목록 조회 오류:', cutError);
      setListData([]);
      return;
    }

    const allSchools = schoolRows || [];
    const approvedCuts = cutRows || [];

    setSchools(allSchools);

    // 올해 자료와 전체 연도 자료를 따로 모읍니다.
    const currentCutsBySchoolId = new Map();
    const latestCutBySchoolId = new Map();

    approvedCuts.forEach(cut => {
      const schoolId = cut.departments?.schools?.id;

      if (!schoolId) return;

      // 전체 연도 중 가장 최근 자료 1건을 상세페이지 링크용으로 보관
      if (!latestCutBySchoolId.has(schoolId)) {
        latestCutBySchoolId.set(schoolId, cut);
      }

      // 전체 목록에 실제로 표시할 것은 현재 연도 자료만
      if (Number(cut.year) === CURRENT_YEAR) {
        if (!currentCutsBySchoolId.has(schoolId)) {
          currentCutsBySchoolId.set(schoolId, []);
        }

        currentCutsBySchoolId.get(schoolId).push(cut);
      }
    });

    const searchText =
      listSchool.trim().toLowerCase();

    const filteredSchools =
      allSchools.filter(school => {
        const schoolName =
          school.school_name?.toLowerCase() || '';

        const matchesSchool =
          !searchText ||
          schoolName.includes(searchText);

        const matchesRegion =
          !listRegion ||
          school.region === listRegion;

        const matchesType =
          !listType ||
          school.school_type === listType;

        return (
          matchesSchool &&
          matchesRegion &&
          matchesType
        );
      });

    const rows = filteredSchools.flatMap(
      school => {
        const currentCuts =
          currentCutsBySchoolId.get(school.id) || [];

        if (currentCuts.length > 0) {
          return currentCuts.map(cut => ({
            ...cut,
            hasCutData: true,
            hasAnyHistory: true,
            detailId: cut.id,
            rowKey: `cut-${cut.id}`
          }));
        }

        const latestCut =
          latestCutBySchoolId.get(school.id);

        return [
          {
            id: null,
            rowKey: `school-${school.id}`,
            hasCutData: false,
            hasAnyHistory: !!latestCut,
            detailId: latestCut?.id || null,
            year: null,
            percentage_cut: null,
            graph_value: null,
            cutoff_text: null,
            is_estimated: false,
            is_below_cutoff: false,
            dormitory: null,
            feature: null,
            updated_at: null,
            departments: {
              id: latestCut?.departments?.id || null,
              department_name:
                latestCut?.departments
                  ?.department_name || null,
              schools: school
            }
          }
        ];
      }
    );

    setListData(rows);
  }

  async function handleRecommend() {
    if (!percentage) {
      alert('성적을 입력해주세요.');
      return;
    }

    setLoading(true);

    const p = parseFloat(percentage);

    const { data, error } = await supabase
      .from('school_cuts')
      .select(`
        *,
        departments(
          department_name,
          schools(
            school_name,
            region,
            school_type
          )
        )
      `)
      .eq('status', 'approved');

    setLoading(false);

    if (error) {
      alert('오류: ' + error.message);
      return;
    }

    let filtered = data || [];

    if (recType) {
      filtered = filtered.filter(
        r => r.departments?.schools?.school_type === recType
      );
    }

    const stableTh = recSettings?.stable_threshold ?? 10;
    const moderateTh = recSettings?.moderate_threshold ?? -3;
    const challengeTh = recSettings?.challenge_threshold ?? -10;

    const groups = {
      stable: [],
      moderate: [],
      challenge: []
    };

    filtered.forEach(r => {
      if (r.is_below_cutoff) {
        groups.stable.push({
          ...r,
          diff: Infinity
        });
        return;
      }

      if (
        r.percentage_cut === null ||
        r.percentage_cut === undefined
      ) {
        return;
      }

      const diff = r.percentage_cut - p;

      const item = {
        ...r,
        diff
      };

      if (diff >= stableTh) {
        groups.stable.push(item);
      } else if (diff >= moderateTh) {
        groups.moderate.push(item);
      } else if (diff >= challengeTh) {
        groups.challenge.push(item);
      }
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
          <a href={`/detail/${r.id}`}>
            {r.departments?.schools?.school_name}
          </a>
          {' - '}
          {r.departments?.department_name || '학과정보 없음'}

          {r.is_below_cutoff ? (
            <>
              {' '}
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  color: 'white',
                  background: '#6b7280'
                }}
              >
                미달
              </span>

              <div style={{ fontSize: 12, color: '#888' }}>
                🏠 기숙사 {r.dormitory || '정보없음'}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#888' }}>
              합격선 {r.percentage_cut}% (여유 {r.diff.toFixed(1)}p)
              {' · '}
              🏠 기숙사 {r.dormitory || '정보없음'}
            </div>
          )}
        </div>
      </div>
    );
  }

  function startEdit(r) {
    if (r.hasCutData === false) return;

    const cutoffMode = r.is_below_cutoff
      ? 'below'
      : r.is_estimated
        ? 'estimated'
        : 'exact';

    setEditingId(r.id);

    setEditForm({
      department_name:
        r.departments?.department_name === '학과정보 없음'
          ? ''
          : r.departments?.department_name || '',
      department_id: r.departments?.id,
      school_id: r.departments?.schools?.id,
      school_type:
        r.departments?.schools?.school_type || '전기고',
      year: r.year,
      cutoff_mode: cutoffMode,
      percentage_cut: r.percentage_cut ?? '',
      graph_value:
        r.graph_value ?? r.percentage_cut ?? '',
      cutoff_text:
        r.cutoff_text ||
        (r.percentage_cut != null
          ? `${r.percentage_cut}%`
          : ''),
      is_estimated: r.is_estimated || false,
      is_below_cutoff: r.is_below_cutoff || false,
      dormitory: r.dormitory || '없음',
      feature: r.feature || ''
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function updateEditForm(key, value) {
    setEditForm(prev => ({
      ...prev,
      [key]: value
    }));
  }

  function handleCutoffModeChange(mode) {
    setEditForm(prev => {
      if (mode === 'below') {
        return {
          ...prev,
          cutoff_mode: 'below',
          percentage_cut: '',
          graph_value: '',
          cutoff_text: '미달',
          is_estimated: false,
          is_below_cutoff: true
        };
      }

      if (mode === 'estimated') {
        const inferred = inferGraphValueFromCutoffText(
          prev.cutoff_text
        );

        return {
          ...prev,
          cutoff_mode: 'estimated',
          percentage_cut: '',
          graph_value:
            inferred ?? prev.graph_value ?? '',
          cutoff_text:
            prev.cutoff_text === '미달'
              ? ''
              : prev.cutoff_text,
          is_estimated: true,
          is_below_cutoff: false
        };
      }

      const exactValue = prev.percentage_cut || '';

      return {
        ...prev,
        cutoff_mode: 'exact',
        graph_value: exactValue,
        cutoff_text: exactValue
          ? `${exactValue}%`
          : '',
        is_estimated: false,
        is_below_cutoff: false
      };
    });
  }

  function handleEstimatedTextChange(value) {
    const inferred = inferGraphValueFromCutoffText(value);

    setEditForm(prev => ({
      ...prev,
      cutoff_text: value,
      graph_value:
        inferred !== null
          ? inferred
          : prev.graph_value
    }));
  }

  async function saveEdit(r) {
    const mode = editForm.cutoff_mode || 'exact';

    let newValue = null;
    let graphValue = null;
    let cutoffText = null;
    let isEstimated = false;
    let isBelowCutoff = false;

    if (mode === 'exact') {
      if (editForm.percentage_cut === '') {
        alert('정확한 합격선 숫자를 입력해주세요.');
        return;
      }

      newValue = Number(editForm.percentage_cut);

      if (
        !Number.isFinite(newValue) ||
        newValue < 0 ||
        newValue > 100
      ) {
        alert('합격선은 0~100 사이 숫자로 입력해주세요.');
        return;
      }

      graphValue = newValue;
      cutoffText = `${newValue}%`;
    } else if (mode === 'estimated') {
      cutoffText = editForm.cutoff_text?.trim();

      if (!cutoffText) {
        alert('예: 70~80%, 90% 초반대처럼 표시 문구를 입력해주세요.');
        return;
      }

      const inferred = inferGraphValueFromCutoffText(
        cutoffText
      );

      graphValue =
        editForm.graph_value === '' ||
        editForm.graph_value === null ||
        editForm.graph_value === undefined
          ? inferred
          : Number(editForm.graph_value);

      if (
        graphValue === null ||
        !Number.isFinite(graphValue) ||
        graphValue < 0 ||
        graphValue > 100
      ) {
        alert('그래프 대표값을 0~100 사이 숫자로 입력해주세요.');
        return;
      }

      newValue = null;
      isEstimated = true;
    } else {
      newValue = null;
      graphValue = null;
      cutoffText = '미달';
      isBelowCutoff = true;
    }

    setEditSaving(true);

    try {
      const deptName =
        editForm.department_name.trim() || '학과정보 없음';

      if (
        editForm.department_id &&
        deptName !== r.departments?.department_name
      ) {
        const { error: departmentError } = await supabase
          .from('departments')
          .update({
            department_name: deptName
          })
          .eq('id', editForm.department_id);

        if (departmentError) {
          throw departmentError;
        }
      }

      if (
        editForm.school_id &&
        editForm.school_type !==
          r.departments?.schools?.school_type
      ) {
        const { error: schoolError } = await supabase
          .from('schools')
          .update({
            school_type: editForm.school_type
          })
          .eq('id', editForm.school_id);

        if (schoolError) {
          throw schoolError;
        }
      }

      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('approval_mode')
        .eq('id', 1)
        .single();

      const approvalMode =
        settingsData?.approval_mode ?? false;

      const { error } = await supabase
        .from('school_cuts')
        .update({
          year: editForm.year,
          percentage_cut: newValue,
          graph_value: graphValue,
          cutoff_text: cutoffText,
          is_estimated: isEstimated,
          is_below_cutoff: isBelowCutoff,
          dormitory: editForm.dormitory,
          feature: editForm.feature,
          status: approvalMode ? 'pending' : 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', r.id);

      if (error) {
        throw error;
      }

      if (r.percentage_cut !== newValue) {
        const { error: historyError } = await supabase
          .from('edit_history')
          .insert({
            cut_id: r.id,
            old_value: r.percentage_cut,
            new_value: newValue
          });

        if (historyError) {
          console.error(
            '수정 기록 저장 오류:',
            historyError
          );
        }
      }

      setEditingId(null);
      setEditForm(null);

      await fetchList();
    } catch (err) {
      alert(
        '수정 중 오류가 발생했습니다: ' + err.message
      );
    } finally {
      setEditSaving(false);
    }
  }

  const canEdit = siteSettings
    ? siteSettings.allow_public_edit !== false
    : true;

  return (
    <div>
      <div className="tabs">
        <button
          className={tab === 'recommend' ? 'active' : ''}
          onClick={() => setTab('recommend')}
        >
          내 성적으로 추천받기
        </button>

        <button
          className={tab === 'list' ? 'active' : ''}
          onClick={() => setTab('list')}
        >
          전체 목록
        </button>
      </div>

      {tab === 'recommend' && (
        <div>
          <div className="card">
            <h2>내 성적으로 학교 추천받기</h2>

            <div className="form-row">
              <div>
                <label>내 백분율 성적 (%)</label>

                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={e =>
                    setPercentage(e.target.value)
                  }
                  placeholder="예: 55"
                />
              </div>

              <div>
                <label>구분</label>

                <select
                  value={recType}
                  onChange={e =>
                    setRecType(e.target.value)
                  }
                >
                  <option value="">전체</option>
                  <option value="전기고">전기고</option>
                  <option value="후기고">후기고</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRecommend}
              disabled={loading}
            >
              {loading
                ? '조회중...'
                : '추천 결과 보기'}
            </button>
          </div>

          {recResult && (
            <div>
              <div className="result-group">
                <h3>
                  <span className="badge stable">
                    안정권
                  </span>
                </h3>

                {recResult.stable.length === 0 && (
                  <p style={{ color: '#999' }}>
                    해당하는 학교가 없어요.
                  </p>
                )}

                {recResult.stable.map(r =>
                  renderResultItem(r)
                )}
              </div>

              <div className="result-group">
                <h3>
                  <span className="badge moderate">
                    적정권
                  </span>
                </h3>

                {recResult.moderate.length === 0 && (
                  <p style={{ color: '#999' }}>
                    해당하는 학교가 없어요.
                  </p>
                )}

                {recResult.moderate.map(r =>
                  renderResultItem(r)
                )}
              </div>

              <div className="result-group">
                <h3>
                  <span className="badge challenge">
                    도전권
                  </span>
                </h3>

                {recResult.challenge.length === 0 && (
                  <p style={{ color: '#999' }}>
                    해당하는 학교가 없어요.
                  </p>
                )}

                {recResult.challenge.map(r =>
                  renderResultItem(r)
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div className="card">
          <h2>전체 목록 ({CURRENT_YEAR}년 기준)</h2>

          <div className="form-row">
            <div>
              <label>
                <strong>학교 검색</strong>
              </label>

              <input
                list="school-search-list"
                value={listSchool}
                onChange={e =>
                  setListSchool(e.target.value)
                }
                placeholder="학교명을 입력하세요 (예: 전주)"
              />

              <datalist id="school-search-list">
                {schools.map(s => (
                  <option
                    key={s.id}
                    value={s.school_name}
                  />
                ))}
              </datalist>
            </div>

            <div>
              <label>지역</label>

              <select
                value={listRegion}
                onChange={e =>
                  setListRegion(e.target.value)
                }
              >
                <option value="">전체</option>

                {REGIONS.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>전기/후기</label>

              <select
                value={listType}
                onChange={e =>
                  setListType(e.target.value)
                }
              >
                <option value="">전체</option>
                <option value="전기고">전기고</option>
                <option value="후기고">후기고</option>
              </select>
            </div>
          </div>

          {listLoading ? (
            <p
              style={{
                textAlign: 'center',
                color: '#999',
                padding: 20
              }}
            >
              학교 목록을 불러오는 중입니다...
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>지역</th>
                  <th style={{ width: '14%' }}>학교</th>
                  <th style={{ width: '8%' }}>구분</th>
                  <th style={{ width: '14%' }}>학과</th>
                  <th style={{ width: '7%' }}>연도</th>
                  <th style={{ width: '10%' }}>합격선</th>
                  <th style={{ width: '8%' }}>기숙사</th>
                  <th style={{ width: '10%' }}>
                    최종수정
                  </th>

                  {canEdit && (
                    <th style={{ width: '10%' }}>
                      관리
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {listData.map(r => {
                  const s =
                    r.departments?.schools;

                  const hasCutData =
                    r.hasCutData !== false;

                  const isEditing =
                    hasCutData &&
                    editingId === r.id;

                  if (isEditing) {
                    return (
                      <tr key={r.rowKey || r.id}>
                        <td>
                          {s?.region ||
                            '정보 없음'}
                        </td>

                        <td>
                          {s?.school_name ||
                            '정보 없음'}
                        </td>

                        <td>
                          <select
                            value={
                              editForm.school_type
                            }
                            onChange={e =>
                              updateEditForm(
                                'school_type',
                                e.target.value
                              )
                            }
                          >
                            <option value="전기고">
                              전기고
                            </option>
                            <option value="후기고">
                              후기고
                            </option>
                          </select>
                        </td>

                        <td>
                          <input
                            value={
                              editForm.department_name
                            }
                            onChange={e =>
                              updateEditForm(
                                'department_name',
                                e.target.value
                              )
                            }
                            placeholder="학과정보 없음"
                            style={{
                              minWidth: 100
                            }}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            value={editForm.year}
                            onChange={e =>
                              updateEditForm(
                                'year',
                                e.target.value
                              )
                            }
                            style={{
                              width: 70
                            }}
                          />
                        </td>

                        <td>
                          <select
                            value={
                              editForm.cutoff_mode || 'exact'
                            }
                            onChange={e =>
                              handleCutoffModeChange(
                                e.target.value
                              )
                            }
                            style={{
                              width: '100%',
                              marginBottom: 6
                            }}
                          >
                            <option value="exact">
                              정확한 값
                            </option>
                            <option value="estimated">
                              범위/대략값
                            </option>
                            <option value="below">
                              미달
                            </option>
                          </select>

                          {editForm.cutoff_mode ===
                          'estimated' ? (
                            <div>
                              <input
                                type="text"
                                value={
                                  editForm.cutoff_text || ''
                                }
                                onChange={e =>
                                  handleEstimatedTextChange(
                                    e.target.value
                                  )
                                }
                                placeholder="예: 70~80%, 90% 초반대"
                                style={{
                                  width: 150,
                                  marginBottom: 4
                                }}
                              />

                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#777'
                                }}
                              >
                                그래프 대표값
                              </div>

                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={
                                  editForm.graph_value ?? ''
                                }
                                onChange={e =>
                                  updateEditForm(
                                    'graph_value',
                                    e.target.value
                                  )
                                }
                                style={{
                                  width: 70
                                }}
                              />
                            </div>
                          ) : editForm.cutoff_mode ===
                            'below' ? (
                            <span
                              style={{
                                fontSize: 12,
                                color: '#666'
                              }}
                            >
                              미달로 표시됩니다.
                            </span>
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={
                                editForm.percentage_cut
                              }
                              onChange={e => {
                                const value = e.target.value;

                                setEditForm(prev => ({
                                  ...prev,
                                  percentage_cut: value,
                                  graph_value: value,
                                  cutoff_text: value
                                    ? `${value}%`
                                    : ''
                                }));
                              }}
                              style={{
                                width: 70
                              }}
                            />
                          )}
                        </td>

                        <td>
                          <select
                            value={
                              editForm.dormitory
                            }
                            onChange={e =>
                              updateEditForm(
                                'dormitory',
                                e.target.value
                              )
                            }
                          >
                            <option value="있음">
                              있음
                            </option>
                            <option value="없음">
                              없음
                            </option>
                          </select>
                        </td>

                        <td
                          style={{
                            fontSize: 12
                          }}
                        >
                          {r.updated_at
                            ? new Date(
                                r.updated_at
                              ).toLocaleString(
                                'ko-KR'
                              )
                            : '정보 없음'}
                        </td>

                        <td>
                          <button
                            onClick={() =>
                              saveEdit(r)
                            }
                            disabled={editSaving}
                            style={{
                              marginRight: 4
                            }}
                          >
                            {editSaving
                              ? '저장중...'
                              : '저장'}
                          </button>

                          <button
                            className="secondary"
                            onClick={cancelEdit}
                          >
                            취소
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={r.rowKey || r.id}>
                      <td>
                        {s?.region || '정보 없음'}
                      </td>

                      <td>
                        {r.detailId ? (
                          <a
                            href={`/detail/${r.detailId}`}
                          >
                            {s?.school_name ||
                              '정보 없음'}
                          </a>
                        ) : (
                          s?.school_name ||
                          '정보 없음'
                        )}
                      </td>

                      <td>
                        {s?.school_type ||
                          '정보 없음'}
                      </td>

                      <td>
                        {hasCutData
                          ? r.departments
                              ?.department_name ||
                            '정보 없음'
                          : '정보 없음'}
                      </td>

                      <td>
                        {hasCutData && r.year
                          ? r.year
                          : '정보 없음'}
                      </td>

                      <td>
                        {!hasCutData
                          ? '정보 없음'
                          : getCutoffDisplayText(r)}

                        {hasCutData &&
                          r.is_estimated && (
                            <div
                              style={{
                                fontSize: 11,
                                color: '#888',
                                marginTop: 2
                              }}
                            >
                              참고 범위
                            </div>
                          )}
                      </td>

                      <td>
                        {hasCutData
                          ? r.dormitory ||
                            '정보 없음'
                          : '정보 없음'}
                      </td>

                      <td
                        style={{
                          fontSize: 12,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {hasCutData &&
                        r.updated_at
                          ? formatYearMonth(
                              r.updated_at
                            )
                          : '정보 없음'}
                      </td>

                      {canEdit && (
                        <td>
                          {hasCutData ? (
                            <button
                              className="secondary"
                              onClick={() =>
                                startEdit(r)
                              }
                            >
                              수정
                            </button>
                          ) : (
                            <span
                              style={{
                                color: '#999'
                              }}
                            >
                              -
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {listData.length === 0 && (
                  <tr>
                    <td
                      colSpan={canEdit ? 9 : 8}
                      style={{
                        textAlign: 'center',
                        color: '#999'
                      }}
                    >
                      검색 조건에 맞는 학교가
                      없어요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <p
            style={{
              fontSize: 12,
              color: '#999',
              marginTop: 8
            }}
          >
            💡 합격선 정보가 없는 학교는 ‘정보
            없음’으로 표시됩니다. 정보가 있는 학교는
            학교명을 클릭하면 상세페이지에서 확인할 수
            있어요.
          </p>
        </div>
      )}
    </div>
  );
}
