'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

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

function getCutoffDisplayText(row) {
  if (!row) return '-';
  if (row.is_below_cutoff) return '미달';

  const text = row.cutoff_text?.trim();
  if (text) return text;

  if (row.percentage_cut !== null && row.percentage_cut !== undefined) {
    return `${row.percentage_cut}%`;
  }

  return '-';
}

function CutoffHistoryChart({ history }) {
  const chartData = history.filter(row => row.year != null);

  if (chartData.length === 0) {
    return (
      <div
        style={{
          marginTop: 14,
          marginBottom: 18,
          padding: 20,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          textAlign: 'center',
          color: '#888'
        }}
      >
        연도별 합격선 정보가 없어요.
      </div>
    );
  }

  const width = Math.max(520, chartData.length * 110);
  const height = 260;
  const padding = {
    top: 26,
    right: 24,
    bottom: 50,
    left: 48
  };

  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = index => {
    if (chartData.length === 1) {
      return padding.left + graphWidth / 2;
    }

    return (
      padding.left +
      (index / (chartData.length - 1)) * graphWidth
    );
  };

  const getY = value =>
    padding.top + ((100 - value) / 100) * graphHeight;

  const points = chartData.map((row, index) => {
    const rawGraphValue =
      row.graph_value ?? row.percentage_cut ?? null;

    const graphValue =
      rawGraphValue === null || rawGraphValue === undefined
        ? null
        : Number(rawGraphValue);

    const hasGraphValue =
      !row.is_below_cutoff &&
      Number.isFinite(graphValue) &&
      graphValue >= 0 &&
      graphValue <= 100;

    return {
      ...row,
      x: getX(index),
      graphValue,
      y: hasGraphValue ? getY(graphValue) : null,
      hasGraphValue,
      displayText: getCutoffDisplayText(row)
    };
  });

  const lineSegments = [];
  let currentSegment = [];

  points.forEach(point => {
    if (point.hasGraphValue) {
      currentSegment.push(point);
      return;
    }

    if (currentSegment.length > 0) {
      lineSegments.push(currentSegment);
      currentSegment = [];
    }
  });

  if (currentSegment.length > 0) {
    lineSegments.push(currentSegment);
  }

  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div
      style={{
        marginTop: 14,
        marginBottom: 18,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        maxWidth: 680,
        marginLeft: 'auto',
        marginRight: 'auto'
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>연도별 백분율 합격선</h3>
        <div
          style={{
            fontSize: 11,
            color: '#888',
            marginTop: 4
          }}
        >
          Y축은 0~100%로 고정되며, 범위·초반·중반·후반 자료는
          그래프용 대표값으로 연결됩니다.
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: '100%',
            minWidth: Math.min(width, 480),
            display: 'block'
          }}
          role="img"
          aria-label="연도별 백분율 합격선 선 그래프"
        >
          {yTicks.map(value => {
            const y = getY(value);

            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#777"
                >
                  {value}%
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={padding.top + graphHeight}
            stroke="#999"
          />
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + graphHeight}
            y2={padding.top + graphHeight}
            stroke="#999"
          />

          {lineSegments.map((segment, index) => {
            if (segment.length < 2) return null;

            const polylinePoints = segment
              .map(point => `${point.x},${point.y}`)
              .join(' ');

            return (
              <polyline
                key={`segment-${index}`}
                points={polylinePoints}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {points.map(point => {
            if (!point.hasGraphValue) {
              return (
                <g key={point.id}>
                  <text
                    x={point.x}
                    y={padding.top + graphHeight - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#666"
                  >
                    {point.is_below_cutoff ? '미달' : point.displayText}
                  </text>
                </g>
              );
            }

            const labelY = Math.min(
              point.y + 20,
              padding.top + graphHeight - 8
            );

            return (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill={point.is_estimated ? 'white' : '#2563eb'}
                  stroke="#2563eb"
                  strokeWidth={point.is_estimated ? '2.5' : '1.8'}
                />

                <text
                  x={point.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#333"
                >
                  {point.displayText}
                </text>
              </g>
            );
          })}

          {points.map(point => (
            <text
              key={`year-${point.id}`}
              x={point.x}
              y={height - 22}
              textAnchor="middle"
              fontSize="11"
              fill="#555"
            >
              {point.year}
            </text>
          ))}

          <text
            x="16"
            y={padding.top + graphHeight / 2}
            fontSize="11"
            fill="#777"
            textAnchor="middle"
            transform={`rotate(-90 16 ${
              padding.top + graphHeight / 2
            })`}
          >
            백분율 합격선
          </text>
        </svg>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: '#777',
          lineHeight: 1.6
        }}
      >
        <div>● 채운 점: 정확한 수치</div>
        <div>○ 빈 점: 범위·대략 자료의 그래프용 대표값</div>
        <div>
          ※ 범위·대략 자료의 대표값은 그래프 표시에만 사용하며 추천 계산에는
          사용하지 않습니다.
        </div>
      </div>
    </div>
  );
}

export default function DetailPage({ params }) {
  const { id } = params;

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchDetail() {
    setLoading(true);

    try {
      const {
        data: detailData,
        error: detailError
      } = await supabase
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
        .eq('id', id)
        .single();

      if (detailError) throw detailError;

      setData(detailData);

      const departmentId = detailData?.departments?.id;

      if (!departmentId) {
        setHistory([]);
        return;
      }

      const {
        data: historyRows,
        error: historyError
      } = await supabase
        .from('school_cuts')
        .select(`
          id,
          department_id,
          year,
          percentage_cut,
          graph_value,
          cutoff_text,
          is_estimated,
          is_below_cutoff,
          updated_at
        `)
        .eq('department_id', departmentId)
        .eq('status', 'approved')
        .order('year', { ascending: true });

      if (historyError) throw historyError;

      const latestByYear = new Map();

      (historyRows || []).forEach(row => {
        if (row.year === null || row.year === undefined) return;

        const yearKey = String(row.year);
        const existing = latestByYear.get(yearKey);

        if (!existing) {
          latestByYear.set(yearKey, row);
          return;
        }

        const existingTime = existing.updated_at
          ? new Date(existing.updated_at).getTime()
          : 0;

        const rowTime = row.updated_at
          ? new Date(row.updated_at).getTime()
          : 0;

        if (rowTime >= existingTime) {
          latestByYear.set(yearKey, row);
        }
      });

      const sortedHistory = Array.from(
        latestByYear.values()
      ).sort((a, b) => Number(a.year) - Number(b.year));

      setHistory(sortedHistory);
    } catch (err) {
      console.error('상세정보 조회 오류:', err);
      setData(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  function getMode(row) {
    if (row?.is_below_cutoff) return 'below';
    if (row?.is_estimated) return 'estimated';
    return 'exact';
  }

  function startEditAll() {
    const s = data?.departments?.schools;

    setEditForm({
      school_name: s?.school_name || '',
      region: s?.region || '',
      school_type: s?.school_type || '전기고',
      department_name:
        data?.departments?.department_name || '학과정보 없음',
      year: data?.year ?? new Date().getFullYear(),
      cutoff_mode: getMode(data),
      percentage_cut: data?.percentage_cut ?? '',
      cutoff_text:
        data?.cutoff_text ||
        (
          data?.percentage_cut != null
            ? `${data.percentage_cut}%`
            : ''
        ),
      graph_value:
        data?.graph_value ??
        data?.percentage_cut ??
        '',
      dormitory: data?.dormitory || '',
      feature: data?.feature || ''
    });

    setEditing(true);
  }

  function cancelEditAll() {
    setEditing(false);
    setEditForm(null);
  }

  function updateEditForm(key, value) {
    setEditForm(prev => ({
      ...prev,
      [key]: value
    }));
  }

  function buildCutPayload() {
    const mode = editForm.cutoff_mode;

    if (mode === 'below') {
      return {
        percentage_cut: null,
        graph_value: null,
        cutoff_text: '미달',
        is_estimated: false,
        is_below_cutoff: true
      };
    }

    if (mode === 'estimated') {
      const text = editForm.cutoff_text.trim();
      const graphValue = Number(editForm.graph_value);

      if (!text) {
        throw new Error(
          '범위·대략 자료의 표시 문구를 입력해주세요.'
        );
      }

      if (
        !Number.isFinite(graphValue) ||
        graphValue < 0 ||
        graphValue > 100
      ) {
        throw new Error(
          '그래프 대표값은 0~100 사이 숫자로 입력해주세요.'
        );
      }

      return {
        percentage_cut: null,
        graph_value: graphValue,
        cutoff_text: text,
        is_estimated: true,
        is_below_cutoff: false
      };
    }

    const exactValue = Number(editForm.percentage_cut);

    if (
      !Number.isFinite(exactValue) ||
      exactValue < 0 ||
      exactValue > 100
    ) {
      throw new Error(
        '정확한 합격선은 0~100 사이 숫자로 입력해주세요.'
      );
    }

    return {
      percentage_cut: exactValue,
      graph_value: exactValue,
      cutoff_text: `${exactValue}%`,
      is_estimated: false,
      is_below_cutoff: false
    };
  }

  async function saveAll() {
    if (!editForm) return;

    const schoolId = data?.departments?.schools?.id;
    const departmentId = data?.departments?.id;

    if (!schoolId || !departmentId) {
      alert('학교 또는 학과 정보를 찾을 수 없습니다.');
      return;
    }

    const schoolName = editForm.school_name.trim();
    const departmentName =
      editForm.department_name.trim() || '학과정보 없음';
    const year = Number(editForm.year);

    if (!schoolName) {
      alert('학교명을 입력해주세요.');
      return;
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      alert('연도를 올바르게 입력해주세요.');
      return;
    }

    setSaving(true);

    try {
      const cutoffPayload = buildCutPayload();

      const {
        data: duplicateRows,
        error: duplicateError
      } = await supabase
        .from('school_cuts')
        .select('id')
        .eq('department_id', departmentId)
        .eq('year', year)
        .neq('id', id)
        .limit(1);

      if (duplicateError) throw duplicateError;

      if (duplicateRows && duplicateRows.length > 0) {
        throw new Error(
          `${year}년 자료가 이미 존재합니다. 해당 연도 상세페이지에서 수정해주세요.`
        );
      }

      const { error: schoolError } = await supabase
        .from('schools')
        .update({
          school_name: schoolName,
          region: editForm.region,
          school_type: editForm.school_type
        })
        .eq('id', schoolId);

      if (schoolError) throw schoolError;

      const { error: departmentError } = await supabase
        .from('departments')
        .update({
          department_name: departmentName
        })
        .eq('id', departmentId);

      if (departmentError) throw departmentError;

      const { error: cutError } = await supabase
        .from('school_cuts')
        .update({
          year,
          ...cutoffPayload,
          dormitory: editForm.dormitory,
          feature: editForm.feature,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (cutError) throw cutError;

      setEditing(false);
      setEditForm(null);
      await fetchDetail();
    } catch (err) {
      alert('저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card">불러오는 중...</div>;
  }

  if (!data) {
    return <div className="card">데이터를 찾을 수 없어요.</div>;
  }

  const s = data.departments?.schools;

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <h2 style={{ marginBottom: 8 }}>
          {s?.school_name} -{' '}
          {data.departments?.department_name || '학과정보 없음'}
        </h2>

        {!editing ? (
          <button
            className="secondary"
            onClick={startEditAll}
          >
            수정
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: 8
            }}
          >
            <button
              onClick={saveAll}
              disabled={saving}
            >
              {saving ? '저장중...' : '전체 저장'}
            </button>

            <button
              className="secondary"
              onClick={cancelEditAll}
              disabled={saving}
            >
              취소
            </button>
          </div>
        )}
      </div>

      <CutoffHistoryChart history={history} />

      <table>
        <tbody>
          <tr>
            <th style={{ width: 120 }}>학교명</th>
            <td>
              {editing ? (
                <input
                  value={editForm.school_name}
                  onChange={e =>
                    updateEditForm(
                      'school_name',
                      e.target.value
                    )
                  }
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              ) : (
                s?.school_name || '-'
              )}
            </td>
          </tr>

          <tr>
            <th>지역</th>
            <td>
              {editing ? (
                <select
                  value={editForm.region}
                  onChange={e =>
                    updateEditForm('region', e.target.value)
                  }
                >
                  <option value="">지역 선택</option>
                  {REGIONS.map(region => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              ) : (
                s?.region || '-'
              )}
            </td>
          </tr>

          <tr>
            <th>전기/후기</th>
            <td>
              {editing ? (
                <select
                  value={editForm.school_type}
                  onChange={e =>
                    updateEditForm(
                      'school_type',
                      e.target.value
                    )
                  }
                >
                  <option value="전기고">전기고</option>
                  <option value="후기고">후기고</option>
                </select>
              ) : (
                s?.school_type || '-'
              )}
            </td>
          </tr>

          <tr>
            <th>학과</th>
            <td>
              {editing ? (
                <input
                  value={editForm.department_name}
                  onChange={e =>
                    updateEditForm(
                      'department_name',
                      e.target.value
                    )
                  }
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              ) : (
                data.departments?.department_name ||
                '학과정보 없음'
              )}
            </td>
          </tr>

          <tr>
            <th>기준년도</th>
            <td>
              {editing ? (
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={editForm.year}
                  onChange={e =>
                    updateEditForm('year', e.target.value)
                  }
                />
              ) : (
                data.year
              )}
            </td>
          </tr>

          <tr>
            <th>합격선</th>
            <td>
              {editing ? (
                <div>
                  <select
                    value={editForm.cutoff_mode}
                    onChange={e =>
                      updateEditForm(
                        'cutoff_mode',
                        e.target.value
                      )
                    }
                    style={{ marginBottom: 8 }}
                  >
                    <option value="exact">정확한 값</option>
                    <option value="estimated">
                      범위·대략값
                    </option>
                    <option value="below">미달</option>
                  </select>

                  {editForm.cutoff_mode === 'exact' && (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editForm.percentage_cut}
                      onChange={e =>
                        updateEditForm(
                          'percentage_cut',
                          e.target.value
                        )
                      }
                      placeholder="예: 62"
                    />
                  )}

                  {editForm.cutoff_mode === 'estimated' && (
                    <div
                      style={{
                        display: 'grid',
                        gap: 8
                      }}
                    >
                      <input
                        value={editForm.cutoff_text}
                        onChange={e =>
                          updateEditForm(
                            'cutoff_text',
                            e.target.value
                          )
                        }
                        placeholder="예: 70~80%, 90% 초반대"
                      />

                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={editForm.graph_value}
                        onChange={e =>
                          updateEditForm(
                            'graph_value',
                            e.target.value
                          )
                        }
                        placeholder="그래프 대표값 예: 75"
                      />
                    </div>
                  )}

                  {editForm.cutoff_mode === 'below' && (
                    <span style={{ color: '#666' }}>
                      미달로 저장됩니다.
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {getCutoffDisplayText(data)}
                  {data.is_estimated && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: '#888'
                      }}
                    >
                      (참고 범위)
                    </span>
                  )}
                </>
              )}
            </td>
          </tr>

          <tr>
            <th>기숙사</th>
            <td>
              {editing ? (
                <input
                  value={editForm.dormitory}
                  onChange={e =>
                    updateEditForm(
                      'dormitory',
                      e.target.value
                    )
                  }
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="예: 있음, 없음, 4인 1실"
                />
              ) : (
                data.dormitory || '-'
              )}
            </td>
          </tr>

          <tr>
            <th>기타 특징</th>
            <td>
              {editing ? (
                <textarea
                  value={editForm.feature}
                  onChange={e =>
                    updateEditForm(
                      'feature',
                      e.target.value
                    )
                  }
                  rows={5}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {data.feature ||
                    '등록된 특징이 없어요.'}
                </div>
              )}
            </td>
          </tr>

          <tr>
            <th>최종수정</th>
            <td>
              {data.updated_at
                ? new Date(data.updated_at).toLocaleString('ko-KR')
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      {editing && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 14,
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={saveAll}
            disabled={saving}
          >
            {saving ? '저장중...' : '전체 저장'}
          </button>

          <button
            className="secondary"
            onClick={cancelEditAll}
            disabled={saving}
          >
            취소
          </button>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <a href="/">← 목록으로 돌아가기</a>
      </div>
    </div>
  );
}
