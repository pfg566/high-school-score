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

function formatYearMonth(dateStr) {
  if (!dateStr) return '정보 없음';

  const d = new Date(dateStr);

  if (Number.isNaN(d.getTime())) {
    return '정보 없음';
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

    const cutsBySchoolId = new Map();

    approvedCuts.forEach(cut => {
      const schoolId = cut.departments?.schools?.id;

      if (!schoolId) return;

      if (!cutsBySchoolId.has(schoolId)) {
        cutsBySchoolId.set(schoolId, []);
      }

      cutsBySchoolId.get(schoolId).push(cut);
    });

    const searchText = listSchool.trim().toLowerCase();

    const filteredSchools = allSchools.filter(school => {
      const schoolName = school.school_name?.toLowerCase() || '';

      const matchesSchool =
        !searchText || schoolName.includes(searchText);

      const matchesRegion =
        !listRegion || school.region === listRegion;

      const matchesType =
        !listType || school.school_type === listType;

      return matchesSchool && matchesRegion && matchesType;
    });

    const rows = filteredSchools.flatMap(school => {
      const schoolCuts = cutsBySchoolId.get(school.id) || [];

      if (schoolCuts.length > 0) {
        return schoolCuts.map(cut => ({
          ...cut,
          hasCutData: true,
          rowKey: `cut-${cut.id}`
        }));
      }

      return [
        {
          id: null,
          rowKey: `school-${school.id}`,
          hasCutData: false,
          year: null,
          percentage_cut: null,
          is_below_cutoff: false,
          dormitory: null,
          feature: null,
          updated_at: null,
          departments: {
            id: null,
            department_name: null,
            schools: school
          }
        }
      ];
    });

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
      percentage_cut: r.percentage_cut ?? '',
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
