'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

function CutoffHistoryChart({ history }) {
  const chartData = history.filter(row => row.year != null);

  if (chartData.length === 0) {
    return (
      <div
        style={{
          marginTop: 20,
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

  const width = 720;
  const height = 320;

  const padding = {
    top: 35,
    right: 30,
    bottom: 55,
    left: 55
  };

  const graphWidth =
    width - padding.left - padding.right;

  const graphHeight =
    height - padding.top - padding.bottom;

  const getX = index => {
    if (chartData.length === 1) {
      return padding.left + graphWidth / 2;
    }

    return (
      padding.left +
      (index / (chartData.length - 1)) * graphWidth
    );
  };

  const getY = value => {
    return (
      padding.top +
      ((100 - value) / 100) * graphHeight
    );
  };

  const points = chartData.map((row, index) => {
    const hasValue =
      !row.is_below_cutoff &&
      row.percentage_cut !== null &&
      row.percentage_cut !== undefined;

    return {
      ...row,
      x: getX(index),
      y: hasValue
        ? getY(Number(row.percentage_cut))
        : null,
      hasValue
    };
  });

  // 미달 데이터가 있으면 선을 끊어서 표시
  const lineSegments = [];
  let currentSegment = [];

  points.forEach(point => {
    if (point.hasValue) {
      currentSegment.push(point);
    } else {
      if (currentSegment.length > 0) {
        lineSegments.push(currentSegment);
      }

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
        marginTop: 20,
        marginBottom: 24,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        overflow: 'hidden'
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>
          연도별 백분율 합격선
        </h3>

        <div
          style={{
            fontSize: 12,
            color: '#888',
            marginTop: 4
          }}
        >
          승인된 합격선 정보를 기준으로 표시합니다.
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: '100%',
            minWidth: 500,
            display: 'block'
          }}
          role="img"
          aria-label="연도별 백분율 합격선 그래프"
        >
          {/* 가로 기준선 + Y축 숫자 */}
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

          {/* Y축 */}
          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={padding.top + graphHeight}
            stroke="#999"
          />

          {/* X축 */}
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + graphHeight}
            y2={padding.top + graphHeight}
            stroke="#999"
          />

          {/* 합격선 */}
          {lineSegments.map((segment, index) => {
            if (segment.length < 2) return null;

            const polylinePoints = segment
              .map(point => `${point.x},${point.y}`)
              .join(' ');

            return (
              <polyline
                key={index}
                points={polylinePoints}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* 데이터 점 */}
          {points.map(point => {
            if (!point.hasValue) {
              return (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={padding.top + graphHeight}
                    r="5"
                    fill="#999"
                  />

                  <text
                    x={point.x}
                    y={padding.top + graphHeight - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#666"
                  >
                    미달
                  </text>
                </g>
              );
            }

            return (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#2563eb"
                  stroke="white"
                  strokeWidth="2"
                />

                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#333"
                >
                  {point.percentage_cut}%
                </text>
              </g>
            );
          })}

          {/* 연도 */}
          {points.map(point => (
            <text
              key={`year-${point.id}`}
              x={point.x}
              y={height - 20}
              textAnchor="middle"
              fontSize="12"
              fill="#555"
            >
              {point.year}
            </text>
          ))}

          {/* Y축 제목 */}
          <text
            x="14"
            y={padding.top + graphHeight / 2}
            fontSize="11"
            fill="#777"
            textAnchor="middle"
            transform={`rotate(-90 14 ${
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
          fontSize: 12,
          color: '#888'
        }}
      >
        ※ 미달 연도는 0%로 계산하지 않으며,
        해당 지점에서 그래프 선이 끊어집니다.
      </div>
    </div>
  );
}

export default function DetailPage({ params }) {
  const { id } = params;

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [editingFeature, setEditingFeature] =
    useState(false);

  const [featureValue, setFeatureValue] =
    useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchDetail() {
    setLoading(true);

    try {
      /*
       * 먼저 현재 합격선 정보를 가져옵니다.
       * departments.id도 같이 가져와야
       * 같은 학과의 연도별 합격선을 찾을 수 있습니다.
       */
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

      if (detailError) {
        throw detailError;
      }

      setData(detailData);
      setFeatureValue(detailData?.feature || '');

      const departmentId =
        detailData?.departments?.id;

      /*
       * 같은 학과의 과거 합격선을 모두 가져옵니다.
       */
      if (departmentId) {
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
            is_below_cutoff,
            updated_at
          `)
          .eq('department_id', departmentId)
          .eq('status', 'approved')
          .order('year', { ascending: true });

        if (historyError) {
          throw historyError;
        }

        /*
         * 같은 학과 + 같은 연도 데이터가
         * 실수로 여러 개 존재할 경우
         * 가장 최근에 수정된 자료 하나만 사용합니다.
         */
        const latestByYear = new Map();

        (historyRows || []).forEach(row => {
          if (row.year === null || row.year === undefined) {
            return;
          }

          const yearKey = String(row.year);

          const existing =
            latestByYear.get(yearKey);

          if (!existing) {
            latestByYear.set(yearKey, row);
            return;
          }

          const existingTime =
            existing.updated_at
              ? new Date(
                  existing.updated_at
                ).getTime()
              : 0;

          const rowTime =
            row.updated_at
              ? new Date(
                  row.updated_at
                ).getTime()
              : 0;

          if (rowTime >= existingTime) {
            latestByYear.set(yearKey, row);
          }
        });

        const sortedHistory = Array.from(
          latestByYear.values()
        ).sort(
          (a, b) =>
            Number(a.year) - Number(b.year)
        );

        setHistory(sortedHistory);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error(
        '상세정보 조회 오류:',
        err
      );

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

      if (error) {
        throw error;
      }

      setEditingFeature(false);

      await fetchDetail();
    } catch (err) {
      alert(
        '저장 중 오류가 발생했습니다: ' +
          err.message
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        불러오는 중...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        데이터를 찾을 수 없어요.
      </div>
    );
  }

  const s = data.departments?.schools;

  return (
    <div className="card">
      <h2>
        {s?.school_name}
        {' - '}
        {data.departments?.department_name ||
          '학과정보 없음'}
      </h2>

      <CutoffHistoryChart history={history} />

      <table>
        <tbody>
          <tr>
            <th style={{ width: 120 }}>
              지역
            </th>

            <td>{s?.region}</td>
          </tr>

          <tr>
            <th>전기/후기</th>

            <td>{s?.school_type}</td>
          </tr>

          <tr>
            <th>학과</th>

            <td>
              {data.departments?.department_name ||
                '학과정보 없음'}
            </td>
          </tr>

          <tr>
            <th>기준년도</th>

            <td>{data.year}</td>
          </tr>

          <tr>
            <th>합격선</th>

            <td>
              {data.is_below_cutoff
                ? '미달'
                : data.percentage_cut != null
                  ? `${data.percentage_cut}%`
                  : '-'}
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
                    onChange={e =>
                      setFeatureValue(
                        e.target.value
                      )
                    }
                    rows={4}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />

                  <div
                    style={{
                      marginTop: 8
                    }}
                  >
                    <button
                      onClick={saveFeature}
                      disabled={saving}
                      style={{
                        marginRight: 8
                      }}
                    >
                      {saving
                        ? '저장중...'
                        : '저장'}
                    </button>

                    <button
                      className="secondary"
                      onClick={
                        cancelEditFeature
                      }
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
                    {data.feature ||
                      '등록된 특징이 없어요.'}
                  </div>

                  <button
                    className="secondary"
                    onClick={
                      startEditFeature
                    }
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
                ? new Date(
                    data.updated_at
                  ).toLocaleString(
                    'ko-KR'
                  )
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        <a href="/">
          ← 목록으로 돌아가기
        </a>
      </div>
    </div>
  );
}
