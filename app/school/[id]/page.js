'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const SERIES_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea'
];

function getCutoffDisplayText(row) {
  if (!row) return '-';
  if (row.is_below_cutoff) return '미달';

  const text = row.cutoff_text?.trim();
  if (text) return text;

  if (
    row.percentage_cut !== null &&
    row.percentage_cut !== undefined
  ) {
    return `${row.percentage_cut}%`;
  }

  return '-';
}

function getGraphValue(row) {
  if (!row || row.is_below_cutoff) return null;

  const raw =
    row.graph_value ??
    row.percentage_cut ??
    null;

  if (raw === null || raw === undefined) {
    return null;
  }

  const value = Number(raw);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    return null;
  }

  return value;
}

function summarizeCutoffs(rows) {
  if (!rows || rows.length === 0) {
    return '-';
  }

  const belowCount =
    rows.filter(row => row.is_below_cutoff).length;

  const numericRows = rows
    .map(row => ({
      row,
      value: getGraphValue(row)
    }))
    .filter(item => item.value !== null);

  if (numericRows.length === 0) {
    return belowCount > 0 ? '미달' : '-';
  }

  if (
    numericRows.length === 1 &&
    rows.length === 1
  ) {
    return getCutoffDisplayText(
      numericRows[0].row
    );
  }

  const values =
    numericRows.map(item => item.value);

  const min = Math.min(...values);
  const max = Math.max(...values);

  const minBand =
    Math.floor(min / 10) * 10;
  const maxBand =
    Math.floor(max / 10) * 10;

  let result;

  if (minBand === maxBand) {
    result =
      minBand >= 100
        ? '100%'
        : `${minBand}%대`;
  } else {
    result = `${minBand}~${maxBand}%`;
  }

  if (belowCount > 0) {
    result += ' · 일부 미달';
  }

  return result;
}

function DepartmentHistoryChart({
  departments,
  history
}) {
  const [groupIndex, setGroupIndex] =
    useState(0);

  const departmentsWithData =
    departments.filter(department =>
      history.some(
        row =>
          row.department_id ===
          department.id
      )
    );

  const pageSize = 4;
  const pageCount = Math.max(
    1,
    Math.ceil(
      departmentsWithData.length /
        pageSize
    )
  );

  useEffect(() => {
    if (groupIndex >= pageCount) {
      setGroupIndex(0);
    }
  }, [groupIndex, pageCount]);

  if (departmentsWithData.length === 0) {
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

  const selectedDepartments =
    departmentsWithData.slice(
      groupIndex * pageSize,
      groupIndex * pageSize + pageSize
    );

  const years = Array.from(
    new Set(
      history
        .filter(row =>
          selectedDepartments.some(
            department =>
              department.id ===
              row.department_id
          )
        )
        .map(row => Number(row.year))
        .filter(Number.isFinite)
    )
  ).sort((a, b) => a - b);

  const width = Math.max(
    560,
    years.length * 105
  );
  const height = 300;

  const padding = {
    top: 34,
    right: 28,
    bottom: 48,
    left: 52
  };

  const graphWidth =
    width - padding.left - padding.right;
  const graphHeight =
    height - padding.top - padding.bottom;

  const getX = year => {
    if (years.length <= 1) {
      return (
        padding.left +
        graphWidth / 2
      );
    }

    const index = years.indexOf(year);

    return (
      padding.left +
      (index / (years.length - 1)) *
        graphWidth
    );
  };

  const getY = value =>
    padding.top +
    ((100 - value) / 100) *
      graphHeight;

  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div
      style={{
        marginTop: 14,
        marginBottom: 18,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        maxWidth: 760,
        marginLeft: 'auto',
        marginRight: 'auto'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 10
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>
            학과별 연도 합격선
          </h3>

          <div
            style={{
              fontSize: 11,
              color: '#888',
              marginTop: 4
            }}
          >
            한 번에 최대 4개 학과를 표시합니다.
            범위·대략 자료는 그래프 대표값으로
            연결됩니다.
          </div>
        </div>

        {pageCount > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap'
            }}
          >
            {Array.from({
              length: pageCount
            }).map((_, index) => {
              const start =
                index * pageSize + 1;
              const end = Math.min(
                (index + 1) * pageSize,
                departmentsWithData.length
              );

              return (
                <button
                  key={index}
                  className={
                    groupIndex === index
                      ? ''
                      : 'secondary'
                  }
                  onClick={() =>
                    setGroupIndex(index)
                  }
                  style={{
                    padding: '5px 9px',
                    fontSize: 12
                  }}
                >
                  {start}~{end}학과
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 8,
          fontSize: 12
        }}
      >
        {selectedDepartments.map(
          (department, index) => (
            <div
              key={department.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 3,
                  display: 'inline-block',
                  background:
                    SERIES_COLORS[index]
                }}
              />
              <span>
                {department.department_name ===
                '학과정보 없음'
                  ? '학교 합격선'
                  : department.department_name}
              </span>
            </div>
          )
        )}
      </div>

      <div
        style={{
          width: '100%',
          overflowX: 'auto'
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: '100%',
            minWidth: Math.min(
              width,
              520
            ),
            display: 'block'
          }}
          role="img"
          aria-label="학과별 연도 합격선 그래프"
        >
          {yTicks.map(value => {
            const y = getY(value);

            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  x2={
                    width -
                    padding.right
                  }
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
            y2={
              padding.top +
              graphHeight
            }
            stroke="#999"
          />

          <line
            x1={padding.left}
            x2={
              width -
              padding.right
            }
            y1={
              padding.top +
              graphHeight
            }
            y2={
              padding.top +
              graphHeight
            }
            stroke="#999"
          />

          {selectedDepartments.map(
            (department, seriesIndex) => {
              const rows = history
                .filter(
                  row =>
                    row.department_id ===
                    department.id
                )
                .sort(
                  (a, b) =>
                    Number(a.year) -
                    Number(b.year)
                );

              const segments = [];
              let current = [];

              rows.forEach(row => {
                const value =
                  getGraphValue(row);

                if (value === null) {
                  if (
                    current.length > 0
                  ) {
                    segments.push(
                      current
                    );
                    current = [];
                  }
                  return;
                }

                current.push({
                  row,
                  value,
                  x: getX(
                    Number(row.year)
                  ),
                  y: getY(value)
                });
              });

              if (current.length > 0) {
                segments.push(current);
              }

              return (
                <g key={department.id}>
                  {segments.map(
                    (segment, index) => {
                      if (
                        segment.length < 2
                      ) {
                        return null;
                      }

                      return (
                        <polyline
                          key={index}
                          points={segment
                            .map(
                              point =>
                                `${point.x},${point.y}`
                            )
                            .join(' ')}
                          fill="none"
                          stroke={
                            SERIES_COLORS[
                              seriesIndex
                            ]
                          }
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    }
                  )}

                  {rows.map(row => {
                    const value =
                      getGraphValue(row);

                    if (value === null) {
                      return null;
                    }

                    const x = getX(
                      Number(row.year)
                    );
                    const y =
                      getY(value);

                    return (
                      <circle
                        key={row.id}
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill={
                          row.is_estimated
                            ? 'white'
                            : SERIES_COLORS[
                                seriesIndex
                              ]
                        }
                        stroke={
                          SERIES_COLORS[
                            seriesIndex
                          ]
                        }
                        strokeWidth={
                          row.is_estimated
                            ? '2.5'
                            : '1.5'
                        }
                      >
                        <title>
                          {department.department_name ===
                          '학과정보 없음'
                            ? '학교 합격선'
                            : department.department_name}
                          {' · '}
                          {row.year}
                          {' · '}
                          {getCutoffDisplayText(
                            row
                          )}
                        </title>
                      </circle>
                    );
                  })}
                </g>
              );
            }
          )}

          {years.map(year => (
            <text
              key={year}
              x={getX(year)}
              y={height - 20}
              textAnchor="middle"
              fontSize="11"
              fill="#555"
            >
              {year}
            </text>
          ))}
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
        ● 채운 점: 정확한 수치 · ○ 빈 점:
        범위·대략 자료
      </div>
    </div>
  );
}

export default function SchoolDetailPage({
  params
}) {
  const { id } = params;

  const [school, setSchool] =
    useState(null);
  const [departments, setDepartments] =
    useState([]);
  const [history, setHistory] =
    useState([]);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    fetchSchoolDetail();
  }, [id]);

  async function fetchSchoolDetail() {
    setLoading(true);

    try {
      const {
        data: schoolData,
        error: schoolError
      } = await supabase
        .from('schools')
        .select(
          'id, school_name, region, school_type'
        )
        .eq('id', id)
        .single();

      if (schoolError) {
        throw schoolError;
      }

      const {
        data: departmentRows,
        error: departmentError
      } = await supabase
        .from('departments')
        .select(
          'id, school_id, department_name'
        )
        .eq('school_id', id)
        .order('department_name');

      if (departmentError) {
        throw departmentError;
      }

      const departmentIds =
        (departmentRows || []).map(
          row => row.id
        );

      let cutRows = [];

      if (departmentIds.length > 0) {
        const {
          data,
          error: cutError
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
            dormitory,
            feature,
            status,
            updated_at
          `)
          .in(
            'department_id',
            departmentIds
          )
          .eq('status', 'approved')
          .order('year', {
            ascending: true
          })
          .order('updated_at', {
            ascending: false
          });

        if (cutError) {
          throw cutError;
        }

        cutRows = data || [];
      }

      // 같은 학과/연도 자료가 여러 건이면
      // 가장 최근 수정본 1건만 사용합니다.
      const latestByDepartmentYear =
        new Map();

      cutRows.forEach(row => {
        const key =
          `${row.department_id}-${row.year}`;

        const existing =
          latestByDepartmentYear.get(
            key
          );

        if (!existing) {
          latestByDepartmentYear.set(
            key,
            row
          );
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
          latestByDepartmentYear.set(
            key,
            row
          );
        }
      });

      const cleanHistory =
        Array.from(
          latestByDepartmentYear.values()
        ).sort((a, b) => {
          const yearDiff =
            Number(a.year) -
            Number(b.year);

          if (yearDiff !== 0) {
            return yearDiff;
          }

          return String(
            a.department_id
          ).localeCompare(
            String(b.department_id)
          );
        });

      setSchool(schoolData);
      setDepartments(
        departmentRows || []
      );
      setHistory(cleanHistory);
    } catch (err) {
      console.error(
        '학교 상세정보 조회 오류:',
        err
      );
      setSchool(null);
      setDepartments([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        불러오는 중...
      </div>
    );
  }

  if (!school) {
    return (
      <div className="card">
        학교 정보를 찾을 수 없어요.
      </div>
    );
  }

  const realDepartments =
    departments.filter(
      department =>
        department.department_name &&
        department.department_name !==
          '학과정보 없음'
    );

  const displayDepartments =
    realDepartments.length > 0
      ? realDepartments
      : departments;

  const latestYear =
    history.length > 0
      ? Math.max(
          ...history
            .map(row =>
              Number(row.year)
            )
            .filter(
              Number.isFinite
            )
        )
      : null;

  const latestRows =
    latestYear !== null
      ? history.filter(
          row =>
            Number(row.year) ===
            latestYear
        )
      : [];

  const cutoffSummary =
    summarizeCutoffs(latestRows);

  const dormitoryValues =
    Array.from(
      new Set(
        latestRows
          .map(row =>
            row.dormitory?.trim()
          )
          .filter(Boolean)
      )
    );

  const featureValues =
    Array.from(
      new Set(
        latestRows
          .map(row =>
            row.feature?.trim()
          )
          .filter(Boolean)
      )
    );

  const latestUpdatedAt =
    history
      .map(row => row.updated_at)
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b).getTime() -
          new Date(a).getTime()
      )[0] || null;

  return (
    <div className="card">
      <h2>
        {school.school_name}
      </h2>

      <DepartmentHistoryChart
        departments={
          displayDepartments.length > 0
            ? displayDepartments
            : departments
        }
        history={history}
      />

      <table>
        <tbody>
          <tr>
            <th style={{ width: 120 }}>
              지역
            </th>
            <td>
              {school.region || '-'}
            </td>
          </tr>

          <tr>
            <th>전기/후기</th>
            <td>
              {school.school_type || '-'}
            </td>
          </tr>

          <tr>
            <th>학과</th>
            <td>
              {realDepartments.length > 0
                ? realDepartments
                    .map(
                      department =>
                        department.department_name
                    )
                    .join(', ')
                : '학과정보 없음'}
            </td>
          </tr>

          <tr>
            <th>기준년도</th>
            <td>
              {latestYear ?? '-'}
            </td>
          </tr>

          <tr>
            <th>합격선</th>
            <td>
              {cutoffSummary}
            </td>
          </tr>

          <tr>
            <th>기숙사</th>
            <td>
              {dormitoryValues.length > 0
                ? dormitoryValues.join(
                    ' / '
                  )
                : '-'}
            </td>
          </tr>

          <tr>
            <th>기타 특징</th>
            <td>
              {featureValues.length > 0 ? (
                featureValues.map(
                  (feature, index) => (
                    <div
                      key={index}
                      style={{
                        whiteSpace:
                          'pre-wrap',
                        marginBottom:
                          index <
                          featureValues.length -
                            1
                            ? 8
                            : 0
                      }}
                    >
                      {feature}
                    </div>
                  )
                )
              ) : (
                '등록된 특징이 없어요.'
              )}
            </td>
          </tr>

          <tr>
            <th>최종수정</th>
            <td>
              {latestUpdatedAt
                ? new Date(
                    latestUpdatedAt
                  ).toLocaleString(
                    'ko-KR'
                  )
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: '#777',
          lineHeight: 1.6
        }}
      >
        ※ 합격선은 최신 연도의 학과별
        값을 묶어 요약합니다. 예:
        61·64·65% → 60%대,
        41·71% → 40~70%.
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/">
          ← 목록으로 돌아가기
        </a>
      </div>
    </div>
  );
}
