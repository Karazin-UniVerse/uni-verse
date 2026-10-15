'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import { courseContentsQueryOptions } from '@uni-hub/queries/moodle/queries';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import type { CourseModule } from '@core/types/moodle';
import { COURSE_MODULE_NAMES, type CourseModuleName } from '@core/constants/moodle';
import { AssignmentModal } from '@uni-hub/components/assignments';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import { selectVisibleSections } from './course-contents.helpers';
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

const CourseContents: React.FC = () => {
  const params = useParams();
  const courseId = (params?.courseId as string) || '';
  const router = useRouter();
  const { formatMessage } = useLanguage();

  const courseIdNumber = Number.parseInt(courseId, 10);
  const contentsQuery = useQuery({
    ...courseContentsQueryOptions(courseIdNumber),
    select: selectVisibleSections,
    enabled: Number.isInteger(courseIdNumber),
  });
  const sections = contentsQuery.data ?? [];

  const [openState, setOpenState] = useState<{ courseId: number; sectionIds: Set<string> } | null>(
    null,
  );
  const openSections =
    openState?.courseId === courseIdNumber
      ? openState.sectionIds
      : new Set(sections.slice(0, 1).map((section) => section.id.toString()));

  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleModuleClick = (courseModule: CourseModule) => {
    if (courseModule.modname === COURSE_MODULE_NAMES.ASSIGN) {
      setSelectedModule(courseModule);
      setModalVisible(true);
    } else if (courseModule.url) {
      window.open(courseModule.url, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleSection = (id: string) => {
    const next = new Set(openSections);

    if (next.has(id)) next.delete(id);
    else next.add(id);

    setOpenState({ courseId: courseIdNumber, sectionIds: next });
  };

  const renderSections = () => {
    if (contentsQuery.isLoading) {
      return <Spinner size="large" tip={formatMessage('courseContents.loading')} />;
    }

    if (contentsQuery.isError) {
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
                      courseModule.modname === COURSE_MODULE_NAMES.ASSIGN ||
                      Boolean(courseModule.url);

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
      <header className={styles.header}>
        <Button
          type="button"
          variant="secondary"
          isTransparent
          onClick={() => router.push('/?tab=courses')}
        >
          <ArrowLeft size={16} /> {formatMessage('courseContents.back')}
        </Button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      <main className={styles.content}>
        <nav className={styles.breadcrumb} aria-label={formatMessage('courseContents.breadcrumbs')}>
          <Link href="/?tab=courses">{formatMessage('courseContents.breadcrumbs')}</Link>
          <span>/</span>
          <span>{formatMessage('courseContents.title')}</span>
        </nav>

        <div className={styles.panel}>
          <h1>{formatMessage('courseContents.title')}</h1>

          {renderSections()}
        </div>
      </main>

      <AssignmentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        module={selectedModule}
        dueUnixSec={selectedModule?.dueUnixSec ?? selectedModule?.duedate}
      />
    </div>
  );
};

export default CourseContents;
