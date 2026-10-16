'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  File,
  Folder,
  FileEdit,
  HelpCircle,
  MessageSquare,
  LayoutGrid,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button, Spinner, Empty } from '@una';
import { hasLoadFailed } from '@uni-hub/queries/load-state';
import { courseContentsQueryOptions } from '@uni-hub/queries/moodle/queries';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { CourseModule } from '@core/types/moodle';
import { COURSE_MODULE_NAMES, type CourseModuleName } from '@core/constants/moodle';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import { STUDY_VIEW } from '../constants';
import { getAssignmentHref, getStudyHref } from '../routes';
import type { CourseContentsProps } from '../types';
import styles from './CourseContents.module.scss';

const getModuleIcon = (modname: CourseModuleName) => {
  switch (modname) {
    case COURSE_MODULE_NAMES.RESOURCE:
      return <File size={22} />;
    case COURSE_MODULE_NAMES.FOLDER:
      return <Folder size={22} />;
    case COURSE_MODULE_NAMES.ASSIGN:
      return <FileEdit size={22} />;
    case COURSE_MODULE_NAMES.QUIZ:
      return <HelpCircle size={22} />;
    case COURSE_MODULE_NAMES.FORUM:
      return <MessageSquare size={22} />;
    default:
      return <LayoutGrid size={22} />;
  }
};

const isAssignmentPageModule = (
  courseModule: CourseModule,
): courseModule is CourseModule & { instance: number } =>
  courseModule.modname === COURSE_MODULE_NAMES.ASSIGN && courseModule.instance !== undefined;

export const CourseContents: React.FC<CourseContentsProps> = ({ courseId }) => {
  const router = useRouter();
  const { formatMessage } = useLanguage();

  const contentsQuery = useQuery(courseContentsQueryOptions(courseId));
  const sections = contentsQuery.data ?? [];

  const [openSectionIds, setOpenSectionIds] = useState<Set<string> | null>(null);
  const openSections =
    openSectionIds ?? new Set(sections.slice(0, 1).map((section) => section.id.toString()));

  const handleModuleClick = (courseModule: CourseModule): void => {
    if (isAssignmentPageModule(courseModule)) {
      router.push(getAssignmentHref(courseModule.instance, courseId));
    } else if (courseModule.url) {
      window.open(courseModule.url, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleSection = (id: string): void => {
    const next = new Set(openSections);

    if (next.has(id)) next.delete(id);
    else next.add(id);

    setOpenSectionIds(next);
  };

  const renderSections = (): React.ReactNode => {
    if (contentsQuery.isLoading) {
      return <Spinner size="large" tip={formatMessage('courseContents.loading')} />;
    }

    if (hasLoadFailed(contentsQuery)) {
      return <LoadErrorState onRetry={() => void contentsQuery.refetch()} />;
    }

    if (sections.length === 0) {
      return <Empty description={formatMessage('courseContents.empty')} />;
    }

    return (
      <div className={styles.sections}>
        {sections.map((section) => {
          const sectionId = section.id.toString();
          const isSectionOpen = openSections.has(sectionId);

          return (
            <div key={sectionId} className={styles.section}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => toggleSection(sectionId)}
                aria-expanded={isSectionOpen}
              >
                <span>{section.name}</span>
                <ChevronDown size={18} className={isSectionOpen ? styles.chevronOpen : ''} />
              </button>
              {isSectionOpen && (
                <ul className={styles.moduleList}>
                  {section.modules.map((courseModule) => {
                    const clickable =
                      isAssignmentPageModule(courseModule) || Boolean(courseModule.url);

                    return (
                      <li key={courseModule.id}>
                        <button
                          type="button"
                          className={`${styles.moduleItem} ${clickable ? styles.clickable : ''}`}
                          onClick={() => handleModuleClick(courseModule)}
                          disabled={!clickable}
                        >
                          <span className={styles.moduleIcon}>
                            {getModuleIcon(courseModule.modname)}
                          </span>
                          <span>
                            <span className={styles.moduleName}>{courseModule.name}</span>
                            <span className={styles.moduleType}>
                              {formatMessage('courseContents.moduleType')}: {courseModule.modname}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <Button
        type="button"
        variant="secondary"
        isTransparent
        onClick={() => router.push(getStudyHref(STUDY_VIEW.Subjects))}
      >
        <ArrowLeft size={16} /> {formatMessage('courseContents.back')}
      </Button>

      <div className={styles.panel}>
        <h3>{formatMessage('courseContents.title')}</h3>

        {renderSections()}
      </div>
    </div>
  );
};
