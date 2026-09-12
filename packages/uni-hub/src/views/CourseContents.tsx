'use client';

import React, { useEffect, useState } from 'react';
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

  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    const fetchContents = async () => {
      setLoading(true);

      try {
        const response = await moodleApi.getCourseContents(Number.parseInt(courseId, 10));
        const validSections = response.data.filter(
          (section: CourseSection) => section.name && section.modules && section.modules.length > 0,
        );

        setSections(validSections);

        if (validSections.length > 0) {
          setOpenSections(new Set([validSections[0].id.toString()]));
        }
      } catch (error) {
        console.error(error);
        toast.error('Не удалось загрузить содержимое курса');
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
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
      return <Spinner size="large" tip="Загрузка содержимого..." />;
    }

    if (sections.length === 0) {
      return <Empty description="В этом курсе пока нет доступных материалов." />;
    }

    return (
      <div className={styles.sections}>
        {sections.map((section) => {
          const key = section.id.toString();
          const open = openSections.has(key);

          return (
            <div key={key} className={styles.section}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => toggleSection(key)}
                aria-expanded={open}
              >
                <span>{section.name}</span>
                <ChevronDown size={18} className={open ? styles.chevronOpen : ''} />
              </button>
              {open && (
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
                            <span className={styles.moduleType}>Тип: {courseModule.modname}</span>
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
          <ArrowLeft size={16} /> Назад до курсів
        </SimpleButton>
      </header>

      <main className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
          <Link href="/?tab=courses">Курсы</Link>
          <span>/</span>
          <span>Содержимое курса</span>
        </nav>

        <div className={styles.panel}>
          <h1>Содержимое курса</h1>

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
