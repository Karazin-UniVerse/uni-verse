'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { Button as SimpleButton, Spinner, Empty, useToast } from '@una';
import { moodleApi } from '@uni-hub/services/api';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import {
  COURSE_MODULE_NAMES,
  type CourseSection,
  type CourseModule,
  type CourseModuleName,
} from '@uni-hub/types';
import { AssignmentModal } from '@uni-hub/components/assignments';
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
  const toast = useToast();
  const { t } = useLanguage();

  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (!courseId) return;

    let cancelled = false;

    const fetchContents = async () => {
      setLoading(true);

      try {
        const response = await moodleApi.getCourseContents(Number.parseInt(courseId, 10));

        if (cancelled) return;

        const validSections = response.data.filter(
          (section: CourseSection) => section.name && section.modules && section.modules.length > 0,
        );

        setSections(validSections);

        if (validSections.length > 0) {
          setOpenSections(new Set([validSections[0].id.toString()]));
        }
      } catch (error) {
        if (cancelled) return;

        console.error(error);
        toast.error(tRef.current('courseContents.loadError'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchContents();

    return () => {
      cancelled = true;
    };
  }, [courseId, toast]);

  const handleModuleClick = (courseModule: CourseModule) => {
    if (courseModule.modname === COURSE_MODULE_NAMES.ASSIGN) {
      setSelectedModule(courseModule);
      setModalVisible(true);
    } else if (courseModule.url) {
      window.open(courseModule.url, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const renderSections = () => {
    if (loading) {
      return <Spinner size="large" tip={t('courseContents.loading')} />;
    }

    if (sections.length === 0) {
      return <Empty description={t('courseContents.empty')} />;
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
                              {t('courseContents.moduleType')}: {courseModule.modname}
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
        <SimpleButton
          type="button"
          variant="secondary"
          size="medium"
          isTransparent
          onClick={() => router.push('/?tab=courses')}
        >
          <ArrowLeft size={16} /> {t('courseContents.back')}
        </SimpleButton>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <LanguageSwitcher placement="top-down" />
          <ThemeSwitcher />
        </div>
      </header>

      <main className={styles.content}>
        <nav className={styles.breadcrumb} aria-label={t('courseContents.breadcrumbs')}>
          <Link href="/?tab=courses">{t('courseContents.breadcrumbs')}</Link>
          <span>/</span>
          <span>{t('courseContents.title')}</span>
        </nav>

        <div className={styles.panel}>
          <h1>{t('courseContents.title')}</h1>

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
