import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { SimpleButton } from '@/design-system';
import { moodleApi } from '@/services/api';
import {
  COURSE_MODULE_NAMES,
  type CourseSection,
  type CourseModule,
  type CourseModuleName,
} from '@/types';
import AssignmentModal from '@/components/AssignmentModal';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
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
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
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
        const response = await moodleApi.getCourseContents(parseInt(courseId, 10));
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

  const handleModuleClick = (mod: CourseModule) => {
    if (mod.modname === COURSE_MODULE_NAMES.ASSIGN) {
      setSelectedModule(mod);
      setModalVisible(true);
    } else if (mod.url) {
      window.open(mod.url, '_blank', 'noopener,noreferrer');
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <SimpleButton
          type="button"
          variant="secondary"
          size="medium"
          isTransparent
          onClick={() => navigate('/dashboard?tab=courses')}
        >
          <ArrowLeft size={16} /> Назад до курсів
        </SimpleButton>
      </header>

      <main className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
          <button type="button" onClick={() => navigate('/dashboard?tab=courses')}>
            Курсы
          </button>
          <span>/</span>
          <span>Содержимое курса</span>
        </nav>

        <div className={styles.panel}>
          <h1>Содержимое курса</h1>

          {loading ? (
            <Spinner size="large" tip="Загрузка содержимого..." />
          ) : sections.length > 0 ? (
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
                        {section.modules.map((mod) => {
                          const clickable =
                            mod.modname === COURSE_MODULE_NAMES.ASSIGN || Boolean(mod.url);

                          return (
                            <li key={mod.id}>
                              <button
                                type="button"
                                className={`${styles.moduleItem} ${clickable ? styles.clickable : ''}`}
                                onClick={() => handleModuleClick(mod)}
                                disabled={!clickable}
                              >
                                <span className={styles.moduleIcon}>
                                  {getModuleIcon(mod.modname)}
                                </span>
                                <span>
                                  <span className={styles.moduleName}>{mod.name}</span>
                                  <span className={styles.moduleType}>Тип: {mod.modname}</span>
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
          ) : (
            <Empty description="В этом курсе пока нет доступных материалов." />
          )}
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
