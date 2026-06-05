export interface Subject {
  id: string
  name: string
  semester: number
  espb: number
  elective: boolean
  electiveGroup: string | null
  description: string
  professors: string[]
  assistants: string[]
}

export interface Material {
  id: string
  subjectId: string
  title: string
  type: "lecture" | "exercise" | "exam" | "script" | "misc"
  category: "theory" | "problems" | "exam" | "misc"
  examPart: string | null
  solved: boolean | null
  fileType: "pdf" | "video" | "image"
  url: string
  pageCount: number
  tags: string[]
}

export interface ExamEvent {
  id: string
  subjectId: string
  title: string
  date: string
  time: string
  location: string
}

export interface SubjectListItem {
  id: string
  name: string
  semester: number
  espb: number
  elective: boolean
  electiveGroup: string | null
  professors: string[]
  materialCount: number
}

export interface SubjectDetail {
  subject: Subject
  materials: Material[]
  exams: ExamEvent[]
}
