import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode, RefObject } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eraser,
  FileImage,
  Files,
  Grip,
  HelpCircle,
  ImagePlus,
  Layers,
  Lock,
  Mail,
  RefreshCw,
  RotateCw,
  Scissors,
  ShieldCheck,
  Stamp,
  Trash2,
  X,
} from 'lucide-react'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { useLocation, useNavigate } from 'react-router-dom'
import './App.css'

type Tool = 'scanner' | 'merge' | 'split' | 'rotate' | 'delete' | 'watermark'
type InfoPanel = 'about' | 'contact' | 'privacy' | 'help'
type Language = 'es' | 'en'

type PageImage = {
  id: string
  file: File
  name: string
  previewUrl: string
  rotation: number
}

type PdfFile = {
  id: string
  file: File
  name: string
  pages: number
  size: number
}

type Adjustments = {
  brightness: number
  contrast: number
  grayscale: boolean
  scanMode: boolean
  autoCrop: boolean
  margin: number
}

const A4 = {
  width: 595.28,
  height: 841.89,
}

const defaultAdjustments: Adjustments = {
  brightness: 108,
  contrast: 132,
  grayscale: false,
  scanMode: false,
  autoCrop: true,
  margin: 24,
}

const toolOrder: Tool[] = ['scanner', 'merge', 'split', 'rotate', 'delete', 'watermark']

const toolRoutes: Record<Tool, string> = {
  scanner: '/imagen-a-pdf',
  merge: '/unir-pdf',
  split: '/dividir-pdf',
  rotate: '/rotar-pdf',
  delete: '/eliminar-paginas-pdf',
  watermark: '/marca-de-agua-pdf',
}

const routeTools = new Map(Object.entries(toolRoutes).map(([tool, path]) => [path, tool as Tool]))

const toolIcons: Record<Tool, typeof FileImage> = {
  scanner: FileImage,
  merge: Layers,
  split: Scissors,
  rotate: RotateCw,
  delete: Eraser,
  watermark: Stamp,
}

const toolText: Record<Language, Record<Tool, { label: string; description: string }>> = {
  es: {
    scanner: {
      label: 'Imagen a PDF',
      description: 'Escanea imagenes, recorta bordes y genera PDF A4.',
    },
    merge: {
      label: 'Unir PDFs',
      description: 'Combina varios PDFs en un solo archivo.',
    },
    split: {
      label: 'Dividir PDF',
      description: 'Extrae paginas o rangos concretos.',
    },
    rotate: {
      label: 'Rotar PDF',
      description: 'Gira todas las paginas de un PDF.',
    },
    delete: {
      label: 'Eliminar paginas',
      description: 'Quita paginas o rangos de un PDF.',
    },
    watermark: {
      label: 'Marca de agua',
      description: 'Anade texto suave a todas las paginas.',
    },
  },
  en: {
    scanner: {
      label: 'Image to PDF',
      description: 'Scan images, crop borders and create an A4 PDF.',
    },
    merge: {
      label: 'Merge PDFs',
      description: 'Combine multiple PDFs into one file.',
    },
    split: {
      label: 'Split PDF',
      description: 'Extract specific pages or page ranges.',
    },
    rotate: {
      label: 'Rotate PDF',
      description: 'Rotate every page in a PDF.',
    },
    delete: {
      label: 'Delete pages',
      description: 'Remove pages or ranges from a PDF.',
    },
    watermark: {
      label: 'Watermark',
      description: 'Add soft text to every page.',
    },
  },
}

const uiText = {
  es: {
    activeTool: 'Herramienta activa',
    localPrivate: 'Local y privado',
    reset: 'Reiniciar',
    openMenu: 'Abrir menu',
    about: 'Quienes somos',
    contact: 'Contacto',
    privacy: 'Privacidad',
    help: 'Ayuda',
    downloadPdf: 'Descargar PDF',
    generating: 'Generando...',
    processPdf: 'Generar PDF',
    processing: 'Procesando...',
    scannerLoading: 'Generando PDF desde imagenes...',
    mergeLoading: 'Uniendo PDFs...',
    splitLoading: 'Extrayendo paginas...',
    rotateLoading: 'Rotando PDF...',
    deleteLoading: 'Eliminando paginas...',
    watermarkLoading: 'Anadiendo marca de agua...',
    success: 'Archivo generado correctamente.',
    error: 'No se pudo generar el archivo.',
    readingPdfs: 'Leyendo PDFs...',
    pdfsLoaded: 'PDFs cargados.',
    noValidPdfs: 'No se cargaron PDFs validos.',
    scanPreparing: 'Preparando tu PDF localmente',
    scannerKicker: 'Rapido. Simple. Poderoso.',
    scannerTitleA: 'Convierte imagenes en',
    scannerTitleB: 'en segundos',
    scannerText:
      'Crea documentos PDF profesionales desde tus imagenes, con recorte automatico y procesamiento privado en tu navegador.',
    uploadImages: 'Arrastra tus imagenes aqui',
    clickSelect: 'o haz clic para seleccionar',
    chooseExplorer: 'Elegir desde el explorador',
    smartScan: 'Escaneo inteligente',
    smartScanText: 'Detecta bordes y mejora el resultado antes de generar el PDF.',
    localTitle: '100% local',
    localText: 'Tus archivos no se suben a ningun servidor.',
    freeTitle: 'Gratis y sin limites',
    freeText: 'Sin registros, sin marcas de agua obligatorias.',
    pdfLocalTool: 'Herramienta PDF local',
    withoutUpload: 'sin subir archivos',
    runsBrowser: 'Todo se ejecuta directamente en tu navegador.',
    privateTitle: 'Privado',
    privateText: 'El PDF se procesa en tu dispositivo.',
    fastTitle: 'Rapido',
    fastText: 'Sin colas, sin servidor y sin esperas innecesarias.',
    uploadPdf: 'Arrastra tu PDF aqui',
    page: 'Pagina',
    pages: 'paginas',
    pdfPages: 'paginas',
    privacyFirst: 'Privacidad primero',
    browserFilesTitle: 'Tus archivos se quedan en tu navegador',
    browserFilesText:
      'HermesPDF procesa imagenes y PDFs en local. No necesitas crear cuenta ni subir documentos a un servidor para usar estas herramientas.',
    viewPrivacy: 'Ver privacidad',
    stepOneTitle: 'Sube tus archivos',
    stepOneText: 'Arrastra imagenes o PDFs a la zona de subida de la herramienta que necesites.',
    stepTwoTitle: 'Ajusta el resultado',
    stepTwoText: 'Ordena paginas, gira, recorta automaticamente o elige rangos segun el caso.',
    stepThreeTitle: 'Descarga al instante',
    stepThreeText: 'Genera el archivo final y descargalo directamente desde tu dispositivo.',
    seoKicker: 'Herramientas PDF gratis',
    seoTitle: 'Convertir, unir y editar PDF online',
    seoText:
      'Usa HermesPDF para trabajar con documentos PDF desde el navegador: convierte imagenes a PDF, une archivos, divide documentos, rota paginas, elimina hojas y anade marcas de agua sin instalar programas.',
    pageTitle: 'HermesPDF | Convertir, unir y editar PDF gratis online',
    pageDescription:
      'HermesPDF te permite convertir imagenes a PDF, unir, dividir, rotar, eliminar paginas y anadir marcas de agua gratis desde tu navegador.',
  },
  en: {
    activeTool: 'Active tool',
    localPrivate: 'Local and private',
    reset: 'Reset',
    openMenu: 'Open menu',
    about: 'About us',
    contact: 'Contact',
    privacy: 'Privacy',
    help: 'Help',
    downloadPdf: 'Download PDF',
    generating: 'Generating...',
    processPdf: 'Create PDF',
    processing: 'Processing...',
    scannerLoading: 'Creating PDF from images...',
    mergeLoading: 'Merging PDFs...',
    splitLoading: 'Extracting pages...',
    rotateLoading: 'Rotating PDF...',
    deleteLoading: 'Deleting pages...',
    watermarkLoading: 'Adding watermark...',
    success: 'File created successfully.',
    error: 'The file could not be created.',
    readingPdfs: 'Reading PDFs...',
    pdfsLoaded: 'PDFs loaded.',
    noValidPdfs: 'No valid PDFs were loaded.',
    scanPreparing: 'Preparing your PDF locally',
    scannerKicker: 'Fast. Simple. Powerful.',
    scannerTitleA: 'Convert images to',
    scannerTitleB: 'in seconds',
    scannerText:
      'Create professional PDF documents from your images, with automatic cropping and private processing in your browser.',
    uploadImages: 'Drop your images here',
    clickSelect: 'or click to select',
    chooseExplorer: 'Choose from file explorer',
    smartScan: 'Smart scanning',
    smartScanText: 'Detects borders and improves the result before creating the PDF.',
    localTitle: '100% local',
    localText: 'Your files are not uploaded to any server.',
    freeTitle: 'Free and unlimited',
    freeText: 'No signups, no mandatory watermarks.',
    pdfLocalTool: 'Local PDF tool',
    withoutUpload: 'without uploading files',
    runsBrowser: 'Everything runs directly in your browser.',
    privateTitle: 'Private',
    privateText: 'The PDF is processed on your device.',
    fastTitle: 'Fast',
    fastText: 'No queues, no server and no unnecessary waiting.',
    uploadPdf: 'Drop your PDF here',
    page: 'Page',
    pages: 'pages',
    pdfPages: 'pages',
    privacyFirst: 'Privacy first',
    browserFilesTitle: 'Your files stay in your browser',
    browserFilesText:
      'HermesPDF processes images and PDFs locally. You do not need an account or a server upload to use these tools.',
    viewPrivacy: 'View privacy',
    stepOneTitle: 'Upload your files',
    stepOneText: 'Drop images or PDFs into the upload area for the tool you need.',
    stepTwoTitle: 'Adjust the result',
    stepTwoText: 'Reorder pages, rotate, crop automatically or choose ranges when needed.',
    stepThreeTitle: 'Download instantly',
    stepThreeText: 'Create the final file and download it directly from your device.',
    seoKicker: 'Free PDF tools',
    seoTitle: 'Convert, merge and edit PDF online',
    seoText:
      'Use HermesPDF to work with PDF documents from your browser: convert images to PDF, merge files, split documents, rotate pages, delete sheets and add watermarks without installing software.',
    pageTitle: 'HermesPDF | Convert, merge and edit PDF online for free',
    pageDescription:
      'HermesPDF lets you convert images to PDF, merge, split, rotate, delete pages and add watermarks for free from your browser.',
  },
}

type UiText = typeof uiText.es

function getTools(language: Language) {
  return toolOrder.map((id) => ({
    id,
    icon: toolIcons[id],
    ...toolText[language][id],
  }))
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [language] = useState<Language>(() => detectLanguage())
  const text = uiText[language]
  const localizedTools = useMemo(() => getTools(language), [language])
  const [activeTool, setActiveTool] = useState<Tool>(() => getToolFromPath(window.location.pathname))
  const [images, setImages] = useState<PageImage[]>([])
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([])
  const [adjustments, setAdjustments] = useState(defaultAdjustments)
  const [pageSelection, setPageSelection] = useState('1')
  const [rotation, setRotation] = useState(90)
  const [watermark, setWatermark] = useState('HermesPDF')
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [infoPanel, setInfoPanel] = useState<InfoPanel | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const totalImageSize = useMemo(
    () => images.reduce((sum, image) => sum + image.file.size, 0),
    [images],
  )

  const activeToolMeta =
    localizedTools.find((tool) => tool.id === activeTool) ?? localizedTools[0]
  const isEmptyStart =
    (activeTool === 'scanner' && images.length === 0) ||
    (activeTool !== 'scanner' && pdfFiles.length === 0)

  useEffect(() => {
    const toolFromRoute = getToolFromPath(location.pathname)
    setActiveTool(toolFromRoute)
    setStatus('')
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.lang = language
    document.title =
      activeTool === 'scanner'
        ? text.pageTitle
        : `${activeToolMeta.label} | HermesPDF`
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        activeTool === 'scanner'
          ? text.pageDescription
          : `${activeToolMeta.description} ${text.pageDescription}`,
      )
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute(
        'href',
        `https://hermespdf.carlitos-dominguez-19.workers.dev${toolRoutes[activeTool]}`,
      )
  }, [activeTool, activeToolMeta.description, activeToolMeta.label, language, text.pageDescription, text.pageTitle])

  const addImages = (fileList: FileList | null) => {
    if (!fileList) return

    const nextImages = Array.from(fileList)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: makeId(file),
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        rotation: 0,
      }))

    setImages((current) => [...current, ...nextImages])
  }

  const addPdfFiles = async (fileList: FileList | null) => {
    if (!fileList) return
    setStatus(text.readingPdfs)

    const files = Array.from(fileList).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    )
    const nextFiles: PdfFile[] = []

    for (const file of files) {
      try {
        const document = await PDFDocument.load(await file.arrayBuffer(), {
          ignoreEncryption: true,
        })
        nextFiles.push({
          id: makeId(file),
          file,
          name: file.name,
          pages: document.getPageCount(),
          size: file.size,
        })
      } catch {
        setStatus(language === 'es' ? `No se pudo leer ${file.name}` : `Could not read ${file.name}`)
      }
    }

    setPdfFiles((current) => [...current, ...nextFiles])
    setStatus(nextFiles.length > 0 ? text.pdfsLoaded : text.noValidPdfs)
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    addImages(event.target.files)
    event.target.value = ''
  }

  const handlePdfChange = (event: ChangeEvent<HTMLInputElement>) => {
    void addPdfFiles(event.target.files)
    event.target.value = ''
  }

  const handleImageDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addImages(event.dataTransfer.files)
  }

  const handlePdfDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void addPdfFiles(event.dataTransfer.files)
  }

  const removeImage = (id: string) => {
    setImages((current) => {
      const image = current.find((item) => item.id === id)
      if (image) URL.revokeObjectURL(image.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  const rotateImage = (id: string) => {
    setImages((current) =>
      current.map((image) =>
        image.id === id ? { ...image, rotation: (image.rotation + 90) % 360 } : image,
      ),
    )
  }

  const moveImage = (id: string, direction: -1 | 1) => {
    setImages((current) => {
      const index = current.findIndex((image) => image.id === id)
      const targetIndex = index + direction

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const movePdf = (id: string, direction: -1 | 1) => {
    setPdfFiles((current) => {
      const index = current.findIndex((file) => file.id === id)
      const targetIndex = index + direction

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const resetAll = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setImages([])
    setPdfFiles([])
    setAdjustments(defaultAdjustments)
    setPageSelection('1')
    setRotation(90)
    setWatermark('HermesPDF')
    setStatus('')
  }

  const exportScannerPdf = async () => {
    if (images.length === 0) return
    await runExport(text.scannerLoading, async () => {
      const pdf = await PDFDocument.create()

      for (const image of images) {
        const processed = await renderImageToJpeg(image, adjustments)
        const embeddedImage = await pdf.embedJpg(processed.bytes)
        const page = pdf.addPage([A4.width, A4.height])
        const pageWidth = A4.width - adjustments.margin * 2
        const pageHeight = A4.height - adjustments.margin * 2
        const scale = Math.min(pageWidth / processed.width, pageHeight / processed.height)
        const drawWidth = processed.width * scale
        const drawHeight = processed.height * scale

        page.drawRectangle({
          x: 0,
          y: 0,
          width: A4.width,
          height: A4.height,
          color: rgb(1, 1, 1),
        })
        page.drawImage(embeddedImage, {
          x: (A4.width - drawWidth) / 2,
          y: (A4.height - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        })
      }

      await downloadPdf(pdf, `imagen-a-pdf-${today()}.pdf`)
    })
  }

  const mergePdfs = async () => {
    if (pdfFiles.length < 2) return
    await runExport(text.mergeLoading, async () => {
      const merged = await PDFDocument.create()

      for (const item of pdfFiles) {
        const source = await PDFDocument.load(await item.file.arrayBuffer(), {
          ignoreEncryption: true,
        })
        const pages = await merged.copyPages(source, source.getPageIndices())
        pages.forEach((page) => merged.addPage(page))
      }

      await downloadPdf(merged, `pdf-unido-${today()}.pdf`)
    })
  }

  const splitPdf = async () => {
    const file = pdfFiles[0]
    if (!file) return
    await runExport(text.splitLoading, async () => {
      const source = await PDFDocument.load(await file.file.arrayBuffer(), {
        ignoreEncryption: true,
      })
      const selectedPages = parsePageSelection(pageSelection, source.getPageCount())
      const output = await PDFDocument.create()
      const pages = await output.copyPages(source, selectedPages)
      pages.forEach((page) => output.addPage(page))
      await downloadPdf(output, `paginas-extraidas-${today()}.pdf`)
    })
  }

  const rotatePdf = async () => {
    const file = pdfFiles[0]
    if (!file) return
    await runExport(text.rotateLoading, async () => {
      const pdf = await PDFDocument.load(await file.file.arrayBuffer(), {
        ignoreEncryption: true,
      })

      pdf.getPages().forEach((page) => {
        const currentAngle = page.getRotation().angle
        page.setRotation(degrees((currentAngle + rotation) % 360))
      })

      await downloadPdf(pdf, `pdf-rotado-${today()}.pdf`)
    })
  }

  const deletePages = async () => {
    const file = pdfFiles[0]
    if (!file) return
    await runExport(text.deleteLoading, async () => {
      const source = await PDFDocument.load(await file.file.arrayBuffer(), {
        ignoreEncryption: true,
      })
      const selectedPages = new Set(parsePageSelection(pageSelection, source.getPageCount()))
      const pagesToKeep = source.getPageIndices().filter((index) => !selectedPages.has(index))

      if (pagesToKeep.length === 0) {
        throw new Error(
          language === 'es' ? 'No puedes eliminar todas las paginas.' : 'You cannot delete every page.',
        )
      }

      const output = await PDFDocument.create()
      const pages = await output.copyPages(source, pagesToKeep)
      pages.forEach((page) => output.addPage(page))
      await downloadPdf(output, `pdf-sin-paginas-${today()}.pdf`)
    })
  }

  const addWatermark = async () => {
    const file = pdfFiles[0]
    if (!file || watermark.trim().length === 0) return
    await runExport(text.watermarkLoading, async () => {
      const pdf = await PDFDocument.load(await file.file.arrayBuffer(), {
        ignoreEncryption: true,
      })
      const font = await pdf.embedFont(StandardFonts.HelveticaBold)
      const text = watermark.trim()

      pdf.getPages().forEach((page) => {
        const { width, height } = page.getSize()
        const fontSize = Math.max(24, Math.min(width, height) / 12)
        const textWidth = font.widthOfTextAtSize(text, fontSize)

        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(0.1, 0.25, 0.32),
          opacity: 0.16,
          rotate: degrees(-30),
        })
      })

      await downloadPdf(pdf, `pdf-marca-agua-${today()}.pdf`)
    })
  }

  const runExport = async (message: string, action: () => Promise<void>) => {
    if (isExporting) return
    setIsExporting(true)
    setStatus(message)
    const startedAt = performance.now()

    try {
      await action()
      await waitForMinimumDuration(startedAt, 1600)
      setStatus(text.success)
    } catch (error) {
      await waitForMinimumDuration(startedAt, 1600)
      setStatus(error instanceof Error ? error.message : text.error)
    } finally {
      setIsExporting(false)
    }
  }

  const renderToolAction = () => {
    if (activeTool === 'scanner') {
      return (
        <button
          className="primary-button"
          type="button"
          onClick={exportScannerPdf}
          disabled={images.length === 0 || isExporting}
        >
          <Download size={18} />
          {isExporting ? text.generating : text.downloadPdf}
        </button>
      )
    }

    const disabled =
      isExporting ||
      pdfFiles.length === 0 ||
      (activeTool === 'merge' && pdfFiles.length < 2) ||
      (activeTool === 'watermark' && watermark.trim().length === 0)
    const actions: Record<Exclude<Tool, 'scanner'>, () => Promise<void>> = {
      merge: mergePdfs,
      split: splitPdf,
      rotate: rotatePdf,
      delete: deletePages,
      watermark: addWatermark,
    }

    return (
      <button
        className="primary-button"
        type="button"
        onClick={() => void actions[activeTool]()}
        disabled={disabled}
      >
        <Download size={18} />
        {isExporting ? text.processing : text.processPdf}
      </button>
    )
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="site-navbar">
          <div className="site-brand">
            <img className="site-mark-image" src="/sparta-mark.png" alt="" aria-hidden="true" />
            <p className="site-wordmark">
              <span>Sparta</span>
              <strong>PDF</strong>
            </p>
          </div>

          <nav className="site-links" aria-label="Navegacion principal">
            <button type="button" onClick={() => selectTool('scanner')}>
              {toolText[language].scanner.label}
            </button>
            <button type="button" onClick={() => selectTool('merge')}>
              {toolText[language].merge.label}
            </button>
            <button type="button" onClick={() => selectTool('split')}>
              {toolText[language].split.label}
            </button>
            <button type="button" onClick={() => openInfoPanel('privacy')}>
              {text.privacy}
            </button>
          </nav>

          <div className="site-menu">
            <button
              className="menu-button"
              type="button"
              aria-label={text.openMenu}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <Grip size={22} />
            </button>
            {isMenuOpen && (
              <div className="menu-popover">
                <button type="button" onClick={() => openInfoPanel('about')}>
                  {text.about}
                </button>
                <button type="button" onClick={() => openInfoPanel('contact')}>
                  {text.contact}
                </button>
                <button type="button" onClick={() => openInfoPanel('privacy')}>
                  {text.privacy}
                </button>
                <button type="button" onClick={() => openInfoPanel('help')}>
                  {text.help}
                </button>
              </div>
            )}
          </div>
        </header>

        <header className="topbar">
          <div>
            <p className="eyebrow">{text.activeTool}</p>
            <h1>{activeToolMeta.label}</h1>
          </div>
          <div className="topbar-actions">
            <div className="privacy-pill">
              <ShieldCheck size={16} />
              {text.localPrivate}
            </div>
            <button className="icon-button" type="button" onClick={resetAll} title={text.reset}>
              <RefreshCw size={19} />
            </button>
            {renderToolAction()}
          </div>
        </header>

        <nav className="tool-tabs" aria-label="Herramientas PDF">
          {localizedTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                className={tool.id === activeTool ? 'is-active' : ''}
                type="button"
                onClick={() => selectTool(tool.id)}
              >
                <Icon size={18} />
                <span>{tool.label}</span>
              </button>
            )
          })}
        </nav>

        <section className={`tool-grid ${isEmptyStart ? 'is-empty-start' : ''}`}>
          <aside className="controls-panel" aria-label="Ajustes">
            {activeTool === 'scanner' ? (
              <ScannerControls
                adjustments={adjustments}
                isDragging={isDragging}
                inputRef={imageInputRef}
                imageCount={images.length}
                totalSize={totalImageSize}
                onChange={setAdjustments}
                onFileChange={handleImageChange}
                onDragOver={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleImageDrop}
                text={text}
              />
            ) : (
              <PdfControls
                activeTool={activeTool}
                files={pdfFiles}
                isDragging={isDragging}
                inputRef={pdfInputRef}
                pageSelection={pageSelection}
                rotation={rotation}
                watermark={watermark}
                onFileChange={handlePdfChange}
                onDragOver={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handlePdfDrop}
                onPageSelectionChange={setPageSelection}
                onRotationChange={setRotation}
                onWatermarkChange={setWatermark}
                text={text}
              />
            )}
            {status && <p className="status-line">{status}</p>}
          </aside>

          <section className="pages-area" aria-label="Area de trabajo">
            {isExporting && (
              <ScanOverlay
                message={status || text.processing}
                preparingMessage={text.scanPreparing}
              />
            )}
            {activeTool === 'scanner' ? (
              <ScannerWorkspace
                images={images}
                adjustments={adjustments}
                inputRef={imageInputRef}
                isDragging={isDragging}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={() => setIsDragging(true)}
                onDrop={handleImageDrop}
                onMove={moveImage}
                onFileChange={handleImageChange}
                onRemove={removeImage}
                onRotate={rotateImage}
                text={text}
              />
            ) : (
              <PdfWorkspace
                activeTool={activeTool}
                files={pdfFiles}
                inputRef={pdfInputRef}
                isDragging={isDragging}
                uploadTitle={activeToolMeta.label}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={() => setIsDragging(true)}
                onDrop={handlePdfDrop}
                onFileChange={handlePdfChange}
                onMove={movePdf}
                onRemove={(id) =>
                  setPdfFiles((current) => current.filter((file) => file.id !== id))
                }
                text={text}
              />
            )}
          </section>
        </section>

        <TrustAndHowItWorks
          language={language}
          text={text}
          onOpenPrivacy={() => openInfoPanel('privacy')}
        />
      </section>

      {infoPanel && (
        <InfoModal panel={infoPanel} language={language} onClose={() => setInfoPanel(null)} />
      )}
    </main>
  )

  function openInfoPanel(panel: InfoPanel) {
    setInfoPanel(panel)
    setIsMenuOpen(false)
  }

  function selectTool(tool: Tool) {
    setActiveTool(tool)
    setStatus('')
    navigate(toolRoutes[tool])
  }
}

function TrustAndHowItWorks({
  language,
  text,
  onOpenPrivacy,
}: {
  language: Language
  text: UiText
  onOpenPrivacy: () => void
}) {
  const seoTopics = {
    es: [
      {
        title: 'Convertir imagenes a PDF',
        body: 'Crea un PDF a partir de imagenes JPG, PNG o WEBP con recorte automatico, ajuste de contraste y modo escaneado.',
      },
      {
        title: 'Unir PDF gratis',
        body: 'Combina varios archivos PDF en un unico documento manteniendo el orden que elijas antes de descargarlo.',
      },
      {
        title: 'Dividir PDF online',
        body: 'Extrae paginas concretas o rangos como 1, 3 o 5-8 para crear un nuevo PDF solo con lo que necesitas.',
      },
      {
        title: 'Rotar y eliminar paginas PDF',
        body: 'Gira paginas completas, elimina hojas innecesarias y deja el documento listo para compartir o archivar.',
      },
      {
        title: 'Marca de agua PDF',
        body: 'Anade una marca de agua de texto a todas las paginas de un PDF para proteger borradores, informes o documentos internos.',
      },
      {
        title: 'PDF privado sin subir archivos',
        body: 'Las operaciones se realizan en tu dispositivo, una ventaja importante si trabajas con documentos personales o profesionales.',
      },
    ],
    en: [
      {
        title: 'Convert images to PDF',
        body: 'Create a PDF from JPG, PNG or WEBP images with automatic cropping, contrast adjustment and scan mode.',
      },
      {
        title: 'Merge PDF for free',
        body: 'Combine several PDF files into a single document while keeping the order you choose before downloading.',
      },
      {
        title: 'Split PDF online',
        body: 'Extract specific pages or ranges such as 1, 3 or 5-8 to create a new PDF with only what you need.',
      },
      {
        title: 'Rotate and delete PDF pages',
        body: 'Rotate full pages, remove unnecessary sheets and leave the document ready to share or archive.',
      },
      {
        title: 'PDF watermark',
        body: 'Add a text watermark to every page in a PDF to protect drafts, reports or internal documents.',
      },
      {
        title: 'Private PDF tools without uploads',
        body: 'Operations run on your device, which helps when working with personal or professional documents.',
      },
    ],
  }

  return (
    <section className="info-sections" aria-label="Informacion de HermesPDF">
      <div className="info-band">
        <div>
          <p className="hero-kicker">{text.privacyFirst}</p>
          <h2>{text.browserFilesTitle}</h2>
          <p>{text.browserFilesText}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onOpenPrivacy}>
          <Lock size={18} />
          {text.viewPrivacy}
        </button>
      </div>

      <div className="how-grid">
        <InfoStep number="1" title={text.stepOneTitle}>
          {text.stepOneText}
        </InfoStep>
        <InfoStep number="2" title={text.stepTwoTitle}>
          {text.stepTwoText}
        </InfoStep>
        <InfoStep number="3" title={text.stepThreeTitle}>
          {text.stepThreeText}
        </InfoStep>
      </div>

      <section className="seo-panel" aria-labelledby="seo-title">
        <div className="seo-intro">
          <p className="hero-kicker">{text.seoKicker}</p>
          <h2 id="seo-title">{text.seoTitle}</h2>
          <p>{text.seoText}</p>
        </div>

        <div className="seo-grid">
          {seoTopics[language].map((topic) => (
            <SeoTopic key={topic.title} title={topic.title}>
              {topic.body}
            </SeoTopic>
          ))}
        </div>
      </section>
    </section>
  )
}

function SeoTopic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="seo-topic">
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  )
}

function InfoStep({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <article className="info-step">
      <span>{number}</span>
      <strong>{title}</strong>
      <p>{children}</p>
    </article>
  )
}

function InfoModal({
  panel,
  language,
  onClose,
}: {
  panel: InfoPanel
  language: Language
  onClose: () => void
}) {
  const content = {
    es: {
      about: {
        icon: <ShieldCheck size={22} />,
        title: 'Quienes somos',
        body: [
          'HermesPDF es una herramienta web pensada para trabajar con PDFs de forma rapida, sencilla y privada.',
          'La idea es ofrecer utilidades practicas para convertir imagenes, unir, dividir, rotar y marcar PDFs sin depender de servidores ni cuentas de usuario.',
        ],
      },
      contact: {
        icon: <Mail size={22} />,
        title: 'Contacto',
        body: [
          'Este bloque quedara preparado para anadir un correo de soporte o un formulario cuando publiques la web.',
          'De momento puedes usarlo como seccion informativa y cambiar el texto final antes del despliegue.',
        ],
      },
      privacy: {
        icon: <Lock size={22} />,
        title: 'Privacidad',
        body: [
          'Los archivos se procesan en el navegador. HermesPDF no sube tus imagenes ni PDFs a un servidor para generar los documentos.',
          'Al cerrar o recargar la pagina, los archivos cargados dejan de estar disponibles en la sesion actual.',
        ],
      },
      help: {
        icon: <HelpCircle size={22} />,
        title: 'Ayuda',
        body: [
          'Elige una herramienta, sube o arrastra tus archivos y pulsa el boton de generar cuando este disponible.',
          'Para rangos de paginas puedes escribir valores como 1,3,5-8. En unir PDFs, el orden de la lista sera el orden del archivo final.',
        ],
      },
    },
    en: {
      about: {
        icon: <ShieldCheck size={22} />,
        title: 'About us',
        body: [
          'HermesPDF is a web tool designed to work with PDFs quickly, simply and privately.',
          'It offers practical utilities to convert images, merge, split, rotate and watermark PDFs without servers or user accounts.',
        ],
      },
      contact: {
        icon: <Mail size={22} />,
        title: 'Contact',
        body: [
          'This section is ready for a support email or contact form when the site grows.',
          'For now it works as an information panel that can be adjusted before a more formal launch.',
        ],
      },
      privacy: {
        icon: <Lock size={22} />,
        title: 'Privacy',
        body: [
          'Files are processed in the browser. HermesPDF does not upload your images or PDFs to a server to create documents.',
          'When you close or reload the page, loaded files are no longer available in the current session.',
        ],
      },
      help: {
        icon: <HelpCircle size={22} />,
        title: 'Help',
        body: [
          'Choose a tool, upload or drop your files and press the generate button when it is available.',
          'For page ranges, use values such as 1,3,5-8. When merging PDFs, the list order will be the order of the final file.',
        ],
      },
    },
  } satisfies Record<Language, Record<InfoPanel, { icon: ReactNode; title: string; body: string[] }>>
  const item = content[language][panel]

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="info-title">
      <article className="info-modal">
        <header>
          <div className="modal-title">
            <span>{item.icon}</span>
            <h2 id="info-title">{item.title}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
          >
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          {item.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </div>
  )
}

function ScanOverlay({
  message,
  preparingMessage,
}: {
  message: string
  preparingMessage: string
}) {
  return (
    <div className="scan-overlay" role="status" aria-live="polite">
      <div className="scan-card">
        <div className="scan-paper">
          <div className="scan-line"></div>
          <div className="paper-row wide"></div>
          <div className="paper-row"></div>
          <div className="paper-row short"></div>
        </div>
        <strong>{message}</strong>
        <span>{preparingMessage}</span>
      </div>
    </div>
  )
}

function ScannerControls({
  adjustments,
  isDragging,
  inputRef,
  imageCount,
  totalSize,
  text,
  onChange,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  adjustments: Adjustments
  isDragging: boolean
  inputRef: RefObject<HTMLInputElement | null>
  imageCount: number
  totalSize: number
  text: UiText
  onChange: (adjustments: Adjustments) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
}) {
  return (
    <>
      <label
        className={`upload-zone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          onDragOver()
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={onFileChange} />
        <ImagePlus size={30} />
        <span>{languageText(text, 'Subir imagenes', 'Upload images')}</span>
        <small>
          {languageText(
            text,
            'JPG, PNG o WebP. El recorte y el PDF se hacen en tu navegador.',
            'JPG, PNG or WebP. Cropping and PDF creation happen in your browser.',
          )}
        </small>
      </label>

      <div className="control-group">
        <div className="control-heading">
          <FileImage size={18} />
          <span>{languageText(text, 'Ajustes de escaner', 'Scanner settings')}</span>
        </div>

        <Toggle
          label={languageText(text, 'Recorte automatico', 'Automatic crop')}
          checked={adjustments.autoCrop}
          onChange={(autoCrop) => onChange({ ...adjustments, autoCrop })}
        />
        <Toggle
          label={languageText(text, 'Modo documento', 'Document mode')}
          checked={adjustments.scanMode}
          onChange={(scanMode) => onChange({ ...adjustments, scanMode })}
        />
        <Toggle
          label={languageText(text, 'Blanco y negro', 'Black and white')}
          checked={adjustments.grayscale}
          onChange={(grayscale) => onChange({ ...adjustments, grayscale })}
        />
        <Slider
          label={languageText(text, 'Brillo', 'Brightness')}
          value={adjustments.brightness}
          min={70}
          max={160}
          suffix="%"
          onChange={(brightness) => onChange({ ...adjustments, brightness })}
        />
        <Slider
          label={languageText(text, 'Contraste', 'Contrast')}
          value={adjustments.contrast}
          min={80}
          max={190}
          suffix="%"
          onChange={(contrast) => onChange({ ...adjustments, contrast })}
        />
        <Slider
          label={languageText(text, 'Margen PDF', 'PDF margin')}
          value={adjustments.margin}
          min={0}
          max={64}
          suffix="pt"
          onChange={(margin) => onChange({ ...adjustments, margin })}
        />
      </div>

      <div className="stats-strip">
        <span>
          {imageCount} {text.pages}
        </span>
        <span>{formatBytes(totalSize)}</span>
      </div>
    </>
  )
}

function PdfControls({
  activeTool,
  files,
  isDragging,
  inputRef,
  pageSelection,
  rotation,
  watermark,
  text,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onPageSelectionChange,
  onRotationChange,
  onWatermarkChange,
}: {
  activeTool: Tool
  files: PdfFile[]
  isDragging: boolean
  inputRef: RefObject<HTMLInputElement | null>
  pageSelection: string
  rotation: number
  watermark: string
  text: UiText
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onPageSelectionChange: (value: string) => void
  onRotationChange: (value: number) => void
  onWatermarkChange: (value: string) => void
}) {
  const multiple = activeTool === 'merge'
  const firstFile = files[0]

  return (
    <>
      <label
        className={`upload-zone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          onDragOver()
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          onChange={onFileChange}
        />
        <Files size={30} />
        <span>{languageText(text, `Subir PDF${multiple ? 's' : ''}`, `Upload PDF${multiple ? 's' : ''}`)}</span>
        <small>
          {multiple
            ? languageText(
                text,
                'El orden de la lista sera el orden del PDF final.',
                'The list order will be the order of the final PDF.',
              )
            : languageText(
                text,
                'Usaremos el primer PDF cargado para esta herramienta.',
                'The first loaded PDF will be used for this tool.',
              )}
        </small>
      </label>

      <div className="control-group">
        <div className="control-heading">
          <Files size={18} />
          <span>{languageText(text, 'Ajustes', 'Settings')}</span>
        </div>

        {(activeTool === 'split' || activeTool === 'delete') && (
          <label className="text-row">
            <span>
              {activeTool === 'split'
                ? languageText(text, 'Paginas a extraer', 'Pages to extract')
                : languageText(text, 'Paginas a eliminar', 'Pages to delete')}
            </span>
            <input
              type="text"
              value={pageSelection}
              placeholder="1,3,5-8"
              onChange={(event) => onPageSelectionChange(event.target.value)}
            />
            <small>
              {firstFile
                ? languageText(
                    text,
                    `Este PDF tiene ${firstFile.pages} paginas.`,
                    `This PDF has ${firstFile.pages} pages.`,
                  )
                : languageText(text, 'Ejemplo: 1,3,5-8', 'Example: 1,3,5-8')}
            </small>
          </label>
        )}

        {activeTool === 'rotate' && (
          <label className="select-row">
            <span>{languageText(text, 'Rotacion', 'Rotation')}</span>
            <select value={rotation} onChange={(event) => onRotationChange(Number(event.target.value))}>
              <option value={90}>{languageText(text, '90 grados', '90 degrees')}</option>
              <option value={180}>{languageText(text, '180 grados', '180 degrees')}</option>
              <option value={270}>{languageText(text, '270 grados', '270 degrees')}</option>
            </select>
          </label>
        )}

        {activeTool === 'watermark' && (
          <label className="text-row">
            <span>{languageText(text, 'Texto de marca', 'Watermark text')}</span>
            <input
              type="text"
              value={watermark}
              maxLength={42}
              onChange={(event) => onWatermarkChange(event.target.value)}
            />
          </label>
        )}
      </div>

      <div className="stats-strip">
        <span>
          {files.length} PDF{files.length === 1 ? '' : 's'}
        </span>
        <span>
          {files.reduce((total, file) => total + file.pages, 0)} {text.pdfPages}
        </span>
      </div>
    </>
  )
}

function ScannerWorkspace({
  images,
  adjustments,
  inputRef,
  isDragging,
  text,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onMove,
  onRemove,
  onRotate,
}: {
  images: PageImage[]
  adjustments: Adjustments
  inputRef: RefObject<HTMLInputElement | null>
  isDragging: boolean
  text: UiText
  onDragLeave: () => void
  onDragOver: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
  onRotate: (id: string) => void
}) {
  if (images.length === 0) {
    return (
      <div className="empty-state empty-start">
        <div className="upload-only">
          <label
            className={`upload-hero ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              onDragOver()
            }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={onFileChange} />
            <div className="upload-medallion-wrap">
              <img className="upload-medallion" src="/upload-medallion.png" alt="" aria-hidden="true" />
              <div className="upload-medallion-copy">
                <strong>{text.uploadImages}</strong>
                <span>{languageText(text, 'Seleccionar imagenes', 'Select images')}</span>
              </div>
            </div>
            <span className="upload-caption">{text.uploadImages}</span>
            <small>{text.clickSelect}</small>
            <div className="format-pills">
              <span>JPG</span>
              <span>PNG</span>
              <span>WEBP</span>
            </div>
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="page-list">
      {images.map((image, index) => (
        <article className="page-card" key={image.id}>
          <div className="page-preview">
            <img
              src={image.previewUrl}
              alt={image.name}
              style={{
                filter: buildCssFilter(adjustments),
                transform: `rotate(${image.rotation}deg)`,
              }}
            />
          </div>
          <div className="page-meta">
            <div>
              <span className="page-number">
                {text.page} {index + 1}
              </span>
              <strong>{image.name}</strong>
            </div>
            <div className="page-actions">
              <IconAction
                label={languageText(text, 'Subir pagina', 'Move page up')}
                disabled={index === 0}
                onClick={() => onMove(image.id, -1)}
                icon={<ArrowUp size={17} />}
              />
              <IconAction
                label={languageText(text, 'Bajar pagina', 'Move page down')}
                disabled={index === images.length - 1}
                onClick={() => onMove(image.id, 1)}
                icon={<ArrowDown size={17} />}
              />
              <IconAction
                label={languageText(text, 'Girar', 'Rotate')}
                onClick={() => onRotate(image.id)}
                icon={<RotateCw size={17} />}
              />
              <IconAction
                label={languageText(text, 'Eliminar', 'Delete')}
                danger
                onClick={() => onRemove(image.id)}
                icon={<Trash2 size={17} />}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function PdfWorkspace({
  activeTool,
  files,
  inputRef,
  isDragging,
  text,
  uploadTitle,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onMove,
  onRemove,
}: {
  activeTool: Tool
  files: PdfFile[]
  inputRef: RefObject<HTMLInputElement | null>
  isDragging: boolean
  text: UiText
  uploadTitle: string
  onDragLeave: () => void
  onDragOver: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
}) {
  const medallionTitle = languageText(text, `Arrastra para ${uploadTitle}`, `Drop file for ${uploadTitle}`)
  const medallionAction = languageText(text, 'Seleccionar PDF', 'Select PDF')

  if (files.length === 0) {
    return (
      <div className="empty-state empty-start">
        <div className="upload-only">
          <label
            className={`upload-hero ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              onDragOver()
            }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple={activeTool === 'merge'}
              onChange={onFileChange}
            />
            <div className="upload-medallion-wrap">
              <img className="upload-medallion" src="/upload-medallion.png" alt="" aria-hidden="true" />
              <div className="upload-medallion-copy">
                <strong>{medallionTitle}</strong>
                <span>{medallionAction}</span>
              </div>
            </div>
            <span className="upload-caption">{medallionTitle}</span>
            <small>{text.clickSelect}</small>
            <div className="format-pills">
              <span>PDF</span>
            </div>
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="pdf-list">
      {files.map((file, index) => (
        <article className="pdf-card" key={file.id}>
          <div className="pdf-icon">
            <Files size={28} />
          </div>
          <div className="pdf-info">
            <strong>{file.name}</strong>
            <span>
              {file.pages} {text.pdfPages} - {formatBytes(file.size)}
            </span>
          </div>
          <div className="page-actions">
            <IconAction
              label={languageText(text, 'Subir PDF', 'Move PDF up')}
              disabled={index === 0}
              onClick={() => onMove(file.id, -1)}
              icon={<ArrowUp size={17} />}
            />
            <IconAction
              label={languageText(text, 'Bajar PDF', 'Move PDF down')}
              disabled={index === files.length - 1}
              onClick={() => onMove(file.id, 1)}
              icon={<ArrowDown size={17} />}
            />
            <IconAction
              label={languageText(text, 'Quitar PDF', 'Remove PDF')}
              danger
              onClick={() => onRemove(file.id)}
              icon={<Trash2 size={17} />}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <label className="slider-row">
      <span>
        {label}
        <strong>
          {value}
          {suffix}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function IconAction({
  label,
  icon,
  danger = false,
  disabled = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`icon-button ${danger ? 'danger' : ''}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  )
}

function buildCssFilter(adjustments: Adjustments) {
  return [
    `brightness(${adjustments.brightness}%)`,
    `contrast(${adjustments.contrast}%)`,
    adjustments.grayscale || adjustments.scanMode ? 'grayscale(100%)' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

async function renderImageToJpeg(image: PageImage, adjustments: Adjustments) {
  const bitmap = await createImageBitmap(image.file)
  const rotatedCanvas = drawRotatedImage(bitmap, image.rotation, buildCssFilter(adjustments))
  const croppedCanvas = adjustments.autoCrop ? cropDocument(rotatedCanvas) : rotatedCanvas
  const outputCanvas = adjustments.scanMode
    ? applyScannerEffect(croppedCanvas)
    : cloneCanvas(croppedCanvas)
  const bytes = await canvasToJpegBytes(outputCanvas)
  bitmap.close()

  return {
    bytes,
    width: outputCanvas.width,
    height: outputCanvas.height,
  }
}

function drawRotatedImage(bitmap: ImageBitmap, rotation: number, filter: string) {
  const isQuarterTurn = rotation === 90 || rotation === 270
  const width = isQuarterTurn ? bitmap.height : bitmap.width
  const height = isQuarterTurn ? bitmap.width : bitmap.height
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error('No se pudo preparar la imagen.')

  canvas.width = width
  canvas.height = height
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.translate(width / 2, height / 2)
  context.rotate((rotation * Math.PI) / 180)
  context.filter = filter
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)

  return canvas
}

function cropDocument(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return canvas

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const bounds = findDocumentBounds(imageData, canvas.width, canvas.height)
  if (!bounds) return canvas

  const padding = Math.round(Math.min(canvas.width, canvas.height) * 0.018)
  const x = Math.max(0, bounds.x - padding)
  const y = Math.max(0, bounds.y - padding)
  const right = Math.min(canvas.width, bounds.x + bounds.width + padding)
  const bottom = Math.min(canvas.height, bounds.y + bounds.height + padding)
  const width = right - x
  const height = bottom - y

  if (width < canvas.width * 0.28 || height < canvas.height * 0.28) {
    return canvas
  }

  const output = document.createElement('canvas')
  const outputContext = output.getContext('2d')
  if (!outputContext) return canvas

  output.width = width
  output.height = height
  outputContext.drawImage(canvas, x, y, width, height, 0, 0, width, height)
  return output
}

function findDocumentBounds(imageData: ImageData, width: number, height: number) {
  const pixels = imageData.data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let hits = 0
  const step = Math.max(1, Math.floor(Math.min(width, height) / 900))

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      const brightness = (red + green + blue) / 3
      const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue)

      if (brightness < 242 || colorSpread > 18) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
        hits += 1
      }
    }
  }

  if (hits < 40 || minX >= maxX || minY >= maxY) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function applyScannerEffect(canvas: HTMLCanvasElement) {
  const output = cloneCanvas(canvas)
  const context = output.getContext('2d', { willReadFrequently: true })
  if (!context) return output

  const imageData = context.getImageData(0, 0, output.width, output.height)
  const pixels = imageData.data

  for (let index = 0; index < pixels.length; index += 4) {
    const average = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
    const normalized = average > 188 ? 255 : Math.max(0, average - 38)
    pixels[index] = normalized
    pixels[index + 1] = normalized
    pixels[index + 2] = normalized
  }

  context.putImageData(imageData, 0, 0)
  return output
}

function cloneCanvas(canvas: HTMLCanvasElement) {
  const output = document.createElement('canvas')
  const context = output.getContext('2d')
  if (!context) return canvas

  output.width = canvas.width
  output.height = canvas.height
  context.drawImage(canvas, 0, 0)
  return output
}

function canvasToJpegBytes(canvas: HTMLCanvasElement) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('No se pudo convertir la imagen.'))
          return
        }

        resolve(await blob.arrayBuffer())
      },
      'image/jpeg',
      0.9,
    )
  })
}

function parsePageSelection(selection: string, totalPages: number) {
  const values = new Set<number>()
  const parts = selection
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    throw new Error('Indica al menos una pagina.')
  }

  for (const part of parts) {
    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-')
      const start = Number(startRaw)
      const end = Number(endRaw)

      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new Error(`Rango no valido: ${part}`)
      }

      for (let page = start; page <= end; page += 1) {
        addPageIndex(values, page, totalPages)
      }
    } else {
      const page = Number(part)

      if (!Number.isInteger(page)) {
        throw new Error(`Pagina no valida: ${part}`)
      }

      addPageIndex(values, page, totalPages)
    }
  }

  return [...values].sort((a, b) => a - b)
}

function addPageIndex(values: Set<number>, page: number, totalPages: number) {
  if (page < 1 || page > totalPages) {
    throw new Error(`La pagina ${page} no existe en este PDF.`)
  }

  values.add(page - 1)
}

async function downloadPdf(pdf: PDFDocument, filename: string) {
  const bytes = await pdf.save()
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function makeId(file: File) {
  return `${file.name}-${file.lastModified}-${crypto.randomUUID()}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function waitForMinimumDuration(startedAt: number, minimumMs: number) {
  const remaining = minimumMs - (performance.now() - startedAt)

  if (remaining <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, remaining)
  })
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 MB'

  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
}

function detectLanguage(): Language {
  const preferredLanguages =
    typeof navigator === 'undefined'
      ? []
      : [navigator.language, ...(navigator.languages ?? [])]

  return preferredLanguages.some((language) => language.toLowerCase().startsWith('es'))
    ? 'es'
    : 'en'
}

function getToolFromPath(pathname: string): Tool {
  if (pathname === '/' || pathname === '') return 'scanner'

  return routeTools.get(pathname) ?? 'scanner'
}

function languageText(text: UiText, spanish: string, english: string) {
  return text.activeTool === uiText.es.activeTool ? spanish : english
}

export default App
