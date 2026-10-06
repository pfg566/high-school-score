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
  const [editing, setEditing] =
    useState(false);
  const [editSchool, setEditSchool] =
    useState(null);
  const [editDepartments, setEditDepartments] =
    useState([]);
  const [editCuts, setEditCuts] =
    useState([]);
  const [saving, setSaving] =
    useState(false);

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

  function getCutMode(row) {
    if (row.is_below_cutoff) {
      return 'below';
    }

    if (row.is_estimated) {
      return 'estimated';
    }

    return 'exact';
  }

  function startEditAll() {
    setEditSchool({
      school_name: school.school_name || '',
      region: school.region || '',
      school_type:
        school.school_type || '전기고'
    });

    setEditDepartments(
      departments.map(department => ({
        id: department.id,
        department_name:
          department.department_name || ''
      }))
    );

    setEditCuts(
      history.map(row => ({
        ...row,
        cutoff_mode: getCutMode(row),
        percentage_cut:
          row.percentage_cut ?? '',
        graph_value:
          row.graph_value ??
          row.percentage_cut ??
          '',
        cutoff_text:
          row.cutoff_text ||
          (
            row.percentage_cut != null
              ? `${row.percentage_cut}%`
              : ''
          ),
        dormitory:
          row.dormitory || '',
        feature:
          row.feature || ''
      }))
    );

    setEditing(true);
  }

  function cancelEditAll() {
    setEditing(false);
    setEditSchool(null);
    setEditDepartments([]);
    setEditCuts([]);
  }

  function updateDepartment(
    departmentId,
    value
  ) {
    setEditDepartments(prev =>
      prev.map(department =>
        department.id === departmentId
          ? {
              ...department,
              department_name: value
            }
          : department
      )
    );
  }

  function updateCut(
    cutId,
    key,
    value
  ) {
    setEditCuts(prev =>
      prev.map(cut =>
        cut.id === cutId
          ? {
              ...cut,
              [key]: value
            }
          : cut
      )
    );
  }

  function buildCutPayload(cut) {
    const year = Number(cut.year);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      throw new Error(
        '모든 연도를 올바르게 입력해주세요.'
      );
    }

    if (cut.cutoff_mode === 'below') {
      return {
        year,
        percentage_cut: null,
        graph_value: null,
        cutoff_text: '미달',
        is_estimated: false,
        is_below_cutoff: true,
        dormitory: cut.dormitory,
        feature: cut.feature,
        updated_at: new Date().toISOString()
      };
    }

    if (cut.cutoff_mode === 'estimated') {
      const text =
        String(cut.cutoff_text || '').trim();
      const graphValue =
        Number(cut.graph_value);

      if (!text) {
        throw new Error(
          `${year}년 범위·대략 자료의 표시 문구를 입력해주세요.`
        );
      }

      if (
        !Number.isFinite(graphValue) ||
        graphValue < 0 ||
        graphValue > 100
      ) {
        throw new Error(
          `${year}년 그래프 대표값은 0~100 사이 숫자여야 합니다.`
        );
      }

      return {
        year,
        percentage_cut: null,
        graph_value: graphValue,
        cutoff_text: text,
        is_estimated: true,
        is_below_cutoff: false,
        dormitory: cut.dormitory,
        feature: cut.feature,
        updated_at: new Date().toISOString()
      };
    }

    const exactValue =
      Number(cut.percentage_cut);

    if (
      !Number.isFinite(exactValue) ||
      exactValue < 0 ||
      exactValue > 100
    ) {
      throw new Error(
        `${year}년 정확한 합격선은 0~100 사이 숫자여야 합니다.`
      );
    }

    return {
      year,
      percentage_cut: exactValue,
      graph_value: exactValue,
      cutoff_text: `${exactValue}%`,
      is_estimated: false,
      is_below_cutoff: false,
      dormitory: cut.dormitory,
      feature: cut.feature,
      updated_at: new Date().toISOString()
    };
  }

  async function saveAll() {
    if (!editSchool) return;

    const schoolName =
      editSchool.school_name.trim();

    if (!schoolName) {
      alert('학교명을 입력해주세요.');
      return;
    }

    for (const department of editDepartments) {
      if (!department.department_name.trim()) {
        alert('학과명은 비워둘 수 없습니다.');
        return;
      }
    }

    let cutPayloads;

    try {
      cutPayloads = editCuts.map(cut => ({
        id: cut.id,
        department_id: cut.department_id,
        payload: buildCutPayload(cut)
      }));
    } catch (err) {
      alert(err.message);
      return;
    }

    setSaving(true);

    try {
      const { error: schoolError } =
        await supabase
          .from('schools')
          .update({
            school_name: schoolName,
            region: editSchool.region,
            school_type:
              editSchool.school_type
          })
          .eq('id', id);

      if (schoolError) {
        throw schoolError;
      }

      for (
        const department
        of editDepartments
      ) {
        const { error } = await supabase
          .from('departments')
          .update({
            department_name:
              department.department_name.trim()
          })
          .eq('id', department.id);

        if (error) throw error;
      }

      for (
        const cut of cutPayloads
      ) {
        const {
          data: duplicateRows,
          error: duplicateError
        } = await supabase
          .from('school_cuts')
          .select('id')
          .eq(
            'department_id',
            cut.department_id
          )
          .eq(
            'year',
            cut.payload.year
          )
          .neq('id', cut.id)
          .limit(1);

        if (duplicateError) {
          throw duplicateError;
        }

        if (
          duplicateRows &&
          duplicateRows.length > 0
        ) {
          const departmentName =
            editDepartments.find(
              department =>
                department.id ===
                cut.department_id
            )?.department_name ||
            '학과';

          throw new Error(
            `${departmentName}의 ${cut.payload.year}년 자료가 이미 존재합니다.`
          );
        }
      }

      for (
        const cut of cutPayloads
      ) {
        const { error } = await supabase
          .from('school_cuts')
          .update(cut.payload)
          .eq('id', cut.id);

        if (error) throw error;
      }

      setEditing(false);
      setEditSchool(null);
      setEditDepartments([]);
      setEditCuts([]);
      await fetchSchoolDetail();
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

  const departmentNameById =
    new Map(
      editDepartments.map(
        department => [
          department.id,
          department.department_name
        ]
      )
    );

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
          {school.school_name}
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
              {saving
                ? '저장중...'
                : '전체 저장'}
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
              학교명
            </th>
            <td>
              {editing ? (
                <input
                  value={
                    editSchool.school_name
                  }
                  onChange={e =>
                    setEditSchool(prev => ({
                      ...prev,
                      school_name:
                        e.target.value
                    }))
                  }
                  style={{
                    width: '100%',
                    boxSizing:
                      'border-box'
                  }}
                />
              ) : (
                school.school_name
              )}
            </td>
          </tr>

          <tr>
            <th>지역</th>
            <td>
              {editing ? (
                <select
                  value={editSchool.region}
                  onChange={e =>
                    setEditSchool(prev => ({
                      ...prev,
                      region: e.target.value
                    }))
                  }
                >
                  <option value="">
                    지역 선택
                  </option>
                  {REGIONS.map(region => (
                    <option
                      key={region}
                      value={region}
                    >
                      {region}
                    </option>
                  ))}
                </select>
              ) : (
                school.region || '-'
              )}
            </td>
          </tr>

          <tr>
            <th>전기/후기</th>
            <td>
              {editing ? (
                <select
                  value={
                    editSchool.school_type
                  }
                  onChange={e =>
                    setEditSchool(prev => ({
                      ...prev,
                      school_type:
                        e.target.value
                    }))
                  }
                >
                  <option value="전기고">
                    전기고
                  </option>
                  <option value="후기고">
                    후기고
                  </option>
                </select>
              ) : (
                school.school_type || '-'
              )}
            </td>
          </tr>

          <tr>
            <th>학과</th>
            <td>
              {editing ? (
                <div
                  style={{
                    display: 'grid',
                    gap: 8
                  }}
                >
                  {editDepartments.length >
                  0 ? (
                    editDepartments.map(
                      department => (
                        <input
                          key={
                            department.id
                          }
                          value={
                            department.department_name
                          }
                          onChange={e =>
                            updateDepartment(
                              department.id,
                              e.target.value
                            )
                          }
                          style={{
                            width: '100%',
                            boxSizing:
                              'border-box'
                          }}
                        />
                      )
                    )
                  ) : (
                    <span
                      style={{
                        color: '#888'
                      }}
                    >
                      등록된 학과가 없습니다.
                    </span>
                  )}
                </div>
              ) : realDepartments.length >
                0 ? (
                realDepartments
                  .map(
                    department =>
                      department.department_name
                  )
                  .join(', ')
              ) : (
                '학과정보 없음'
              )}
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
              {editing && (
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    color: '#777'
                  }}
                >
                  아래 ‘학과별 합격선 자료’에서
                  모든 연도 값을 수정하세요.
                </div>
              )}
            </td>
          </tr>

          <tr>
            <th>기숙사</th>
            <td>
              {dormitoryValues.length >
              0
                ? dormitoryValues.join(
                    ' / '
                  )
                : '-'}
            </td>
          </tr>

          <tr>
            <th>기타 특징</th>
            <td>
              {featureValues.length >
              0 ? (
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

              {editing && (
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    color: '#777'
                  }}
                >
                  특징도 아래 학과별 자료에서
                  각 연도별로 수정할 수 있습니다.
                </div>
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

      {editing && (
        <div
          style={{
            marginTop: 20,
            borderTop:
              '1px solid #e5e7eb',
            paddingTop: 18
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 12
            }}
          >
            학과별 합격선 자료
          </h3>

          {editCuts.length === 0 ? (
            <div
              style={{
                color: '#888',
                padding: '12px 0'
              }}
            >
              현재 수정할 합격선 자료가 없습니다.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 14
              }}
            >
              {editCuts.map(cut => (
                <div
                  key={cut.id}
                  style={{
                    border:
                      '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: 12
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 10
                    }}
                  >
                    {departmentNameById.get(
                      cut.department_id
                    ) ||
                      '학과정보 없음'}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 10
                    }}
                  >
                    <div>
                      <label>
                        연도
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        value={cut.year}
                        onChange={e =>
                          updateCut(
                            cut.id,
                            'year',
                            e.target.value
                          )
                        }
                        style={{
                          width: '100%',
                          boxSizing:
                            'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label>
                        합격선 유형
                      </label>
                      <select
                        value={
                          cut.cutoff_mode
                        }
                        onChange={e =>
                          updateCut(
                            cut.id,
                            'cutoff_mode',
                            e.target.value
                          )
                        }
                        style={{
                          width: '100%'
                        }}
                      >
                        <option value="exact">
                          정확한 값
                        </option>
                        <option value="estimated">
                          범위·대략값
                        </option>
                        <option value="below">
                          미달
                        </option>
                      </select>
                    </div>

                    {cut.cutoff_mode ===
                      'exact' && (
                      <div>
                        <label>
                          합격선 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={
                            cut.percentage_cut
                          }
                          onChange={e =>
                            updateCut(
                              cut.id,
                              'percentage_cut',
                              e.target.value
                            )
                          }
                          style={{
                            width: '100%',
                            boxSizing:
                              'border-box'
                          }}
                        />
                      </div>
                    )}

                    {cut.cutoff_mode ===
                      'estimated' && (
                      <>
                        <div>
                          <label>
                            화면 표시
                          </label>
                          <input
                            value={
                              cut.cutoff_text
                            }
                            onChange={e =>
                              updateCut(
                                cut.id,
                                'cutoff_text',
                                e.target.value
                              )
                            }
                            placeholder="예: 70~80%"
                            style={{
                              width:
                                '100%',
                              boxSizing:
                                'border-box'
                            }}
                          />
                        </div>

                        <div>
                          <label>
                            그래프 대표값
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={
                              cut.graph_value
                            }
                            onChange={e =>
                              updateCut(
                                cut.id,
                                'graph_value',
                                e.target.value
                              )
                            }
                            style={{
                              width:
                                '100%',
                              boxSizing:
                                'border-box'
                            }}
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label>
                        기숙사
                      </label>
                      <input
                        value={
                          cut.dormitory
                        }
                        onChange={e =>
                          updateCut(
                            cut.id,
                            'dormitory',
                            e.target.value
                          )
                        }
                        style={{
                          width: '100%',
                          boxSizing:
                            'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10
                    }}
                  >
                    <label>
                      기타 특징
                    </label>
                    <textarea
                      rows={4}
                      value={cut.feature}
                      onChange={e =>
                        updateCut(
                          cut.id,
                          'feature',
                          e.target.value
                        )
                      }
                      style={{
                        width: '100%',
                        boxSizing:
                          'border-box'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 14,
              justifyContent:
                'flex-end'
            }}
          >
            <button
              onClick={saveAll}
              disabled={saving}
            >
              {saving
                ? '저장중...'
                : '전체 저장'}
            </button>

            <button
              className="secondary"
              onClick={cancelEditAll}
              disabled={saving}
            >
              취소
            </button>
          </div>
        </div>
      )}

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
