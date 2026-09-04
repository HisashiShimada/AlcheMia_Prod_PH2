'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { App } from 'antd';
import { useApi } from '@/hooks/useApi';
import { getProjects } from '@/services/projectApiService';
import { getVisibleOrganizationGroups } from '@/services/organizationGroupApiService';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Project } from '@/types/project';
import type { ProjectListResponse } from '@/types/project';
import type { ServiceApiResponse as ApiResponse } from '@/types/api';
import type { User } from '@/types/auth';

/**
 * プロジェクト一覧・フィルタ・ソートを管理する hook
 */
export const useProjectList = (user?: User) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const [projects, setProjects] = useState<Project[]>([]);
  const [visibleGroups, setVisibleGroups] = useState<Array<{ cd: string; name: string; isActive: boolean }>>([]);

  // フィルタ・ソート state（sessionStorage から復元）
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_searchQuery') ?? '';
    }
    return '';
  });

  const [ownerFilter, setOwnerFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_ownerFilter') ?? 'my_only';
    }
    return 'my_only';
  });

  const [groupFilter, setGroupFilter] = useState<string>('all');

  const [checkoutFilter, setCheckoutFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_checkoutFilter') ?? 'all';
    }
    return 'all';
  });

  const [projectStatusFilter, setProjectStatusFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_projectStatusFilter') ?? 'all';
    }
    return 'all';
  });

  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('projectManagement_sortBy');
      if (saved === 'name' || saved === 'status' || saved === 'createdAt') return saved;
    }
    return 'createdAt';
  });

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('projectManagement_sortOrder');
      if (saved === 'asc' || saved === 'desc') return saved;
    }
    return 'desc';
  });

  // プロジェクト一覧を API 経由で取得
  const {
    data: projectsData,
    error: projectsError,
    refetch: refetchProjects,
  } = useApi<ApiResponse<ProjectListResponse>>(async () => await getProjects(), []);


  // プロジェクトデータが取得できたら state を更新
  useEffect(() => {
    console.log('📊 [ProjectManagement] projectsData received:', projectsData);
    if (!projectsData) return;
    if (projectsError) {
      console.error('❌ [ProjectManagement] API error:', projectsError);
      message.error(t('project.fetchListFailed'));
      return;
    }
    if (projectsData.success && projectsData.data) {
      const projectsList = Array.isArray(projectsData.data)
        ? projectsData.data
        : ((projectsData.data as ProjectListResponse)?.projects || []);
      console.log('✅ [ProjectManagement] Setting projects:', projectsList.length, 'projects');
      setProjects(projectsList);
    } else {
      setProjects([]);
    }
  }, [projectsData, projectsError]); // eslint-disable-line react-hooks/exhaustive-deps

  // 閲覧可能グループ一覧を初期取得
  useEffect(() => {
    getVisibleOrganizationGroups()
      .then(setVisibleGroups)
      .catch((err) => console.warn('[ProjectManagement] 閲覧可能グループ取得失敗:', err));
  }, []);

  // フィルタ・ソート状態を sessionStorage に保存
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem('projectManagement_searchQuery', searchQuery); }, [searchQuery]);
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem('projectManagement_ownerFilter', ownerFilter); }, [ownerFilter]);
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem('projectManagement_checkoutFilter', checkoutFilter); }, [checkoutFilter]);
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem('projectManagement_projectStatusFilter', projectStatusFilter); }, [projectStatusFilter]);
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem('projectManagement_sortBy', sortBy); }, [sortBy]);
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem('projectManagement_sortOrder', sortOrder); }, [sortOrder]);

  // グループ未所属フラグ
  const isUnassignedToGroup = useMemo(() => {
    if (!user) return false;
    if (user.roleCd === 'ROLE002') return false;
    return Array.isArray(user.organizationGroupCds) && user.organizationGroupCds.length === 0;
  }, [user]);

  // フィルタリングされたプロジェクト一覧
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    return projects.filter((project) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        (project.name ?? '').toLowerCase().includes(q) ||
        (project.description ?? '').toLowerCase().includes(q) ||
        (project.ownerName ?? '').toLowerCase().includes(q);

      const matchesOwner =
        ownerFilter !== 'my_only' || project.owner === user?.id;

      let matchesCheckout = true;
      if (checkoutFilter === 'checked_out') matchesCheckout = project.isCheckedOut === true;
      else if (checkoutFilter === 'checked_in') matchesCheckout = project.isCheckedOut === false;

      let matchesProjectStatus = true;
      if (projectStatusFilter !== 'all') {
        const filterStatusNum = parseInt(projectStatusFilter, 10);
        if (!isNaN(filterStatusNum)) matchesProjectStatus = project.status === filterStatusNum;
      }

      let matchesGroup = true;
      if (groupFilter !== 'all') matchesGroup = (project as any).organizationGroupCd === groupFilter;

      return matchesSearch && matchesOwner && matchesCheckout && matchesProjectStatus && matchesGroup;
    });
  }, [projects, searchQuery, ownerFilter, user, checkoutFilter, projectStatusFilter, groupFilter]);

  // ソート済みプロジェクト一覧
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'status') comparison = a.status - b.status;
      else if (sortBy === 'createdAt') comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredProjects, sortBy, sortOrder]);

  // ソート変更ハンドラ
  const handleSortChange = useCallback(
    (newSortBy: 'name' | 'status' | 'createdAt') => {
      if (sortBy === newSortBy) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(newSortBy);
        setSortOrder('desc');
      }
    },
    [sortBy, sortOrder]
  );

  return {
    projects,
    setProjects,
    visibleGroups,
    refetchProjects,
    isUnassignedToGroup,
    searchQuery,
    setSearchQuery,
    ownerFilter,
    setOwnerFilter,
    groupFilter,
    setGroupFilter,
    checkoutFilter,
    setCheckoutFilter,
    projectStatusFilter,
    setProjectStatusFilter,
    sortBy,
    sortOrder,
    handleSortChange,
    filteredProjects,
    sortedProjects,
  };
};
