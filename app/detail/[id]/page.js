'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

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
  const [editingFeature, setEditingFeature] = useState(false);
  const [featureValue, setFeatureValue] = useState('');
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
      setFeatureValue(detailData?.feature || '');

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

      // 동일 학과/연도 데이터가 여러 개면 가장 최근 수정본만 표시
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
        .update({
          feature: featureValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setEditingFeature(false);
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
      <h2>
        {s?.school_name} -{' '}
        {data.departments?.department_name || '학과정보 없음'}
      </h2>

      <CutoffHistoryChart history={history} />

      <table>
        <tbody>
          <tr>
            <th style={{ width: 120 }}>지역</th>
            <td>{s?.region}</td>
          </tr>
          <tr>
            <th>전기/후기</th>
            <td>{s?.school_type}</td>
          </tr>
          <tr>
            <th>학과</th>
            <td>
              {data.departments?.department_name || '학과정보 없음'}
            </td>
          </tr>
          <tr>
            <th>기준년도</th>
            <td>{data.year}</td>
          </tr>
          <tr>
            <th>합격선</th>
            <td>
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
            </td>
          </tr>
          <tr>
            <th>기숙사</th>
            <td>{data.dormitory || '-'}</td>
          </tr>
          <tr>
            <th>기타 특징</th>
            <td>
              {editingFeature ? (
                <div>
                  <textarea
                    value={featureValue}
                    onChange={e => setFeatureValue(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={saveFeature}
                      disabled={saving}
                      style={{ marginRight: 8 }}
                    >
                      {saving ? '저장중...' : '저장'}
                    </button>
                    <button
                      className="secondary"
                      onClick={cancelEditFeature}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      marginBottom: 8
                    }}
                  >
                    {data.feature || '등록된 특징이 없어요.'}
                  </div>
                  <button
                    className="secondary"
                    onClick={startEditFeature}
                  >
                    특징 수정
                  </button>
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

      <div style={{ marginTop: 16 }}>
        <a href="/">← 목록으로 돌아가기</a>
      </div>
    </div>
  );
}
