import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent, DragEvent, FormEvent, ReactNode, RefObject } from 'react'
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
import openCvScriptUrl from '@techstark/opencv-js/dist/opencv.js?url'
import './App.css'

type Tool = 'scanner' | 'merge' | 'split' | 'rotate' | 'delete' | 'watermark'
type InfoPanel = 'about' | 'contact' | 'privacy' | 'terms' | 'help'
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

const A4 = {
  width: 595.28,
  height: 841.89,
}

const SCANNER_PDF_MARGIN = 24

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
      'SpartaPDF procesa imagenes y PDFs en local. No necesitas crear cuenta ni subir documentos a un servidor para usar estas herramientas.',
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
      'Usa SpartaPDF para trabajar con documentos PDF desde el navegador: convierte imagenes a PDF, une archivos, divide documentos, rota paginas, elimina hojas y anade marcas de agua sin instalar programas.',
    pageTitle: 'SpartaPDF | Convertir, unir y editar PDF gratis online',
    pageDescription:
      'SpartaPDF te permite convertir imagenes a PDF, unir, dividir, rotar, eliminar paginas y anadir marcas de agua gratis desde tu navegador.',
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
      'SpartaPDF processes images and PDFs locally. You do not need an account or a server upload to use these tools.',
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
      'Use SpartaPDF to work with PDF documents from your browser: convert images to PDF, merge files, split documents, rotate pages, delete sheets and add watermarks without installing software.',
    pageTitle: 'SpartaPDF | Convert, merge and edit PDF online for free',
    pageDescription:
      'SpartaPDF lets you convert images to PDF, merge, split, rotate, delete pages and add watermarks for free from your browser.',
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
  const [pageSelection, setPageSelection] = useState('1')
  const [rotation, setRotation] = useState(90)
  const [watermark, setWatermark] = useState('SpartaPDF')
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
        : `${activeToolMeta.label} | SpartaPDF`
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
        `https://spartapdf.com${toolRoutes[activeTool]}`,
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
    setPageSelection('1')
    setRotation(90)
    setWatermark('SpartaPDF')
    setStatus('')
  }

  const exportScannerPdf = async () => {
    if (images.length === 0) return
    await runExport(text.scannerLoading, async () => {
      const pdf = await PDFDocument.create()

      for (const image of images) {
        const processed = await renderImageToJpeg(image)
        const embeddedImage = await pdf.embedJpg(processed.bytes)
        const page = pdf.addPage([A4.width, A4.height])
        const pageWidth = A4.width - SCANNER_PDF_MARGIN * 2
        const pageHeight = A4.height - SCANNER_PDF_MARGIN * 2
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
    }, 8500)
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

  const runExport = async (message: string, action: () => Promise<void>, minimumDuration = 1600) => {
    if (isExporting) return
    setIsExporting(true)
    setStatus(message)
    const startedAt = performance.now()

    try {
      await action()
      await waitForMinimumDuration(startedAt, minimumDuration)
      setStatus(text.success)
    } catch (error) {
      await waitForMinimumDuration(startedAt, minimumDuration)
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
          <button
            className="site-brand"
            type="button"
            aria-label="SpartaPDF - Inicio"
            onClick={() => navigate('/')}
          >
            <img className="site-mark-image" src="/sparta-mark.png" alt="" aria-hidden="true" />
            <p className="site-wordmark">
              <span>Sparta</span>
              <strong>PDF</strong>
            </p>
          </button>

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
            <h1>{activeToolMeta.label}</h1>
          </div>
          <div className="topbar-actions">
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
                isDragging={isDragging}
                inputRef={imageInputRef}
                imageCount={images.length}
                totalSize={totalImageSize}
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
                language={language}
                message={status || text.processing}
                preparingMessage={text.scanPreparing}
                previewUrl={activeTool === 'scanner' ? images[0]?.previewUrl : undefined}
              />
            )}
            {activeTool === 'scanner' ? (
              <ScannerWorkspace
                images={images}
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

        <SiteFooter
          language={language}
          onOpenInfo={openInfoPanel}
          onSelectTool={selectTool}
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

function SiteFooter({
  language,
  onOpenInfo,
  onSelectTool,
}: {
  language: Language
  onOpenInfo: (panel: InfoPanel) => void
  onSelectTool: (tool: Tool) => void
}) {
  const footerText = {
    es: {
      tagline: 'PDFs rapidos, privados y sencillos.',
      tools: 'Herramientas',
      company: 'Empresa',
      product: 'Producto',
      legal: 'Legal',
      imagePdf: 'Imagen a PDF',
      mergePdf: 'Unir PDF',
      splitPdf: 'Dividir PDF',
      watermarkPdf: 'Marca de agua',
      about: 'Quienes somos',
      contact: 'Contacto',
      help: 'Ayuda',
      privacy: 'Privacidad',
      terms: 'Condiciones de uso',
      security: 'Seguridad',
      pricing: 'Precio',
      desktop: 'Version web',
      language: 'Espanol',
      made: 'Hecho para trabajar con documentos sin complicaciones.',
    },
    en: {
      tagline: 'Fast, private and simple PDFs.',
      tools: 'Tools',
      company: 'Company',
      product: 'Product',
      legal: 'Legal',
      imagePdf: 'Image to PDF',
      mergePdf: 'Merge PDF',
      splitPdf: 'Split PDF',
      watermarkPdf: 'Watermark PDF',
      about: 'About us',
      contact: 'Contact',
      help: 'Help',
      privacy: 'Privacy',
      terms: 'Terms of use',
      security: 'Security',
      pricing: 'Pricing',
      desktop: 'Web version',
      language: 'English',
      made: 'Made for working with documents without friction.',
    },
  } satisfies Record<Language, Record<string, string>>
  const content = footerText[language]

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <section className="footer-brand" aria-label="SpartaPDF">
          <button
            className="footer-logo"
            type="button"
            aria-label="SpartaPDF - Inicio"
            onClick={() => onSelectTool('scanner')}
          >
            <img src="/sparta-mark.png" alt="" aria-hidden="true" />
            <span>
              Sparta<strong>PDF</strong>
            </span>
          </button>
          <p>{content.tagline}</p>
        </section>

        <FooterColumn title={content.tools}>
          <button type="button" onClick={() => onSelectTool('scanner')}>
            {content.imagePdf}
          </button>
          <button type="button" onClick={() => onSelectTool('merge')}>
            {content.mergePdf}
          </button>
          <button type="button" onClick={() => onSelectTool('split')}>
            {content.splitPdf}
          </button>
          <button type="button" onClick={() => onSelectTool('watermark')}>
            {content.watermarkPdf}
          </button>
        </FooterColumn>

        <FooterColumn title={content.company}>
          <button type="button" onClick={() => onOpenInfo('about')}>
            {content.about}
          </button>
          <button type="button" onClick={() => onOpenInfo('contact')}>
            {content.contact}
          </button>
          <button type="button" onClick={() => onOpenInfo('help')}>
            {content.help}
          </button>
        </FooterColumn>

        <FooterColumn title={content.product}>
          <button type="button" onClick={() => onOpenInfo('privacy')}>
            {content.security}
          </button>
          <button type="button" onClick={() => onOpenInfo('help')}>
            {content.desktop}
          </button>
          <button type="button" onClick={() => onOpenInfo('contact')}>
            {content.pricing}
          </button>
        </FooterColumn>

        <FooterColumn title={content.legal}>
          <button type="button" onClick={() => onOpenInfo('privacy')}>
            {content.privacy}
          </button>
          <button type="button" onClick={() => onOpenInfo('terms')}>
            {content.terms}
          </button>
        </FooterColumn>
      </div>

      <div className="footer-social" aria-label="Redes sociales">
        <span>in</span>
        <span>f</span>
        <span>yt</span>
        <span>X</span>
      </div>

      <div className="footer-bottom">
        <p>(c) 2026 SpartaPDF - {content.made}</p>
        <div>
          <button type="button" onClick={() => onOpenInfo('privacy')}>
            {content.privacy}
          </button>
          <button type="button" onClick={() => onOpenInfo('contact')}>
            {content.contact}
          </button>
          <span>{content.language}</span>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="footer-column">
      <h2>{title}</h2>
      {children}
    </section>
  )
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
        body: 'Crea un PDF a partir de imagenes JPG, PNG o WEBP con deteccion de bordes, enderezado automatico y mejora de iluminacion.',
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
        body: 'Create a PDF from JPG, PNG or WEBP images with border detection, automatic straightening and lighting enhancement.',
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
    <section className="info-sections" aria-label="Informacion de SpartaPDF">
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
          'SpartaPDF es una herramienta web pensada para trabajar con PDFs de forma rapida, sencilla y privada.',
          'La idea es ofrecer utilidades practicas para convertir imagenes, unir, dividir, rotar y marcar PDFs sin depender de servidores ni cuentas de usuario.',
        ],
      },
      contact: {
        icon: <Mail size={22} />,
        title: 'Contacto',
        body: [
          'Si tienes una duda, una sugerencia o detectas un problema, puedes enviar un mensaje desde este formulario.',
          'El formulario no guarda tus datos en SpartaPDF: prepara un correo en tu aplicacion de email para que puedas revisarlo antes de enviarlo.',
        ],
      },
      privacy: {
        icon: <Lock size={22} />,
        title: 'Privacidad',
        body: [
          'SpartaPDF esta disenado para trabajar con tus documentos directamente en el navegador siempre que la herramienta lo permita.',
          'Los archivos que seleccionas se procesan en tu dispositivo y no se suben a un servidor de SpartaPDF para crear, unir, dividir, rotar o modificar PDFs.',
          'Al cerrar o recargar la pagina, los archivos cargados dejan de estar disponibles en la sesion actual.',
          'Usamos Google Tag Manager y herramientas de analitica para conocer visitas, paginas usadas y rendimiento general de la web. Estas metricas nos ayudan a mejorar SpartaPDF y no se usan para procesar tus documentos.',
        ],
      },
      terms: {
        icon: <Stamp size={22} />,
        title: 'Condiciones de uso',
        body: [
          'SpartaPDF ofrece herramientas gratuitas para trabajar con archivos PDF e imagenes desde el navegador.',
          'Debes usar la web solo con archivos sobre los que tengas derecho de uso y evitando contenido ilegal, danino o que vulnere derechos de terceros.',
          'Aunque trabajamos para que las herramientas funcionen correctamente, no podemos garantizar que el resultado sea adecuado para todos los usos profesionales, legales o administrativos. Revisa siempre el documento final antes de compartirlo.',
          'SpartaPDF puede cambiar, mejorar o retirar funciones para mantener la seguridad, estabilidad y calidad del servicio.',
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
          'SpartaPDF is a web tool designed to work with PDFs quickly, simply and privately.',
          'It offers practical utilities to convert images, merge, split, rotate and watermark PDFs without servers or user accounts.',
        ],
      },
      contact: {
        icon: <Mail size={22} />,
        title: 'Contact',
        body: [
          'If you have a question, suggestion or found an issue, you can send a message from this form.',
          'The form does not store your data in SpartaPDF: it prepares an email in your mail app so you can review it before sending.',
        ],
      },
      privacy: {
        icon: <Lock size={22} />,
        title: 'Privacy',
        body: [
          'SpartaPDF is designed to work with your documents directly in the browser whenever the tool allows it.',
          'The files you select are processed on your device and are not uploaded to a SpartaPDF server to create, merge, split, rotate or edit PDFs.',
          'When you close or reload the page, loaded files are no longer available in the current session.',
          'We use Google Tag Manager and analytics tools to understand visits, used pages and general website performance. These metrics help us improve SpartaPDF and are not used to process your documents.',
        ],
      },
      terms: {
        icon: <Stamp size={22} />,
        title: 'Terms of use',
        body: [
          'SpartaPDF provides free tools for working with PDF files and images from the browser.',
          'You should only use the website with files you have the right to use, avoiding illegal, harmful content or content that infringes third-party rights.',
          'Although we work to keep the tools reliable, we cannot guarantee that the result is suitable for every professional, legal or administrative use. Always review the final document before sharing it.',
          'SpartaPDF may change, improve or remove features to maintain the security, stability and quality of the service.',
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

  function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const subject = String(formData.get('subject') ?? '').trim()
    const message = String(formData.get('message') ?? '').trim()
    const body = [
      `Nombre: ${name}`,
      `Email: ${email}`,
      '',
      message,
    ].join('\n')
    const mailto = new URL('mailto:contacto@spartapdf.com')
    mailto.searchParams.set('subject', subject || 'Contacto desde SpartaPDF')
    mailto.searchParams.set('body', body)
    window.location.href = mailto.toString()
  }

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
          {panel === 'contact' && (
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <label>
                <span>{language === 'es' ? 'Nombre' : 'Name'}</span>
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                <span>{language === 'es' ? 'Asunto' : 'Subject'}</span>
                <input name="subject" type="text" required />
              </label>
              <label>
                <span>{language === 'es' ? 'Mensaje' : 'Message'}</span>
                <textarea name="message" rows={5} required />
              </label>
              <button className="primary-button" type="submit">
                <Mail size={18} />
                {language === 'es' ? 'Preparar email' : 'Prepare email'}
              </button>
            </form>
          )}
        </div>
      </article>
    </div>
  )
}

function ScanOverlay({
  language,
  message,
  preparingMessage,
  previewUrl,
}: {
  language: Language
  message: string
  preparingMessage: string
  previewUrl?: string
}) {
  const steps =
    language === 'es'
      ? ['Detectando bordes', 'Enderezando documento', 'Mejorando iluminacion', 'Generando PDF']
      : ['Detecting borders', 'Straightening document', 'Improving lighting', 'Creating PDF']

  return (
    <div className="scan-overlay" role="status" aria-live="polite">
      <div className="scan-card">
        <SpartaScanAnimation
          label={language === 'es' ? 'Escaneando y creando PDF...' : 'Scanning and creating PDF...'}
        />
        <div className={`scan-paper ${previewUrl ? 'has-preview' : ''}`}>
          {previewUrl && (
            <img className="scan-preview-image" src={previewUrl} alt="" aria-hidden="true" />
          )}
          <div className="scan-frame"></div>
          <div className="scan-corner top-left"></div>
          <div className="scan-corner top-right"></div>
          <div className="scan-corner bottom-left"></div>
          <div className="scan-corner bottom-right"></div>
          <div className="scan-line"></div>
          <div className="scan-glow"></div>
          {!previewUrl && (
            <>
              <div className="paper-row wide"></div>
              <div className="paper-row"></div>
              <div className="paper-row short"></div>
            </>
          )}
        </div>
        <strong>{message}</strong>
        <span>{preparingMessage}</span>
        <ol className="scan-steps">
          {steps.map((step, index) => (
            <li key={step} style={{ '--step-index': index } as CSSProperties}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function SpartaScanAnimation({ label }: { label: string }) {
  return (
    <div className="sparta-scan-loader" aria-label={label}>
      <div className="scan-track">
        <svg className="photo-card" viewBox="0 0 120 86" aria-hidden="true">
          <rect x="4" y="4" width="112" height="78" rx="10" />
          <circle cx="31" cy="28" r="9" />
          <path d="M17 67 L48 42 L69 60 L83 48 L105 67 Z" />
        </svg>

        <svg className="scan-machine" viewBox="0 0 160 112" aria-hidden="true">
          <rect className="machine-body" x="18" y="28" width="124" height="58" rx="16" />
          <rect className="machine-slot" x="33" y="43" width="94" height="12" rx="6" />
          <rect className="machine-exit" x="38" y="72" width="84" height="9" rx="4.5" />
          <circle className="machine-dot" cx="130" cy="37" r="5" />
          <line className="scan-light" x1="42" y1="50" x2="118" y2="50" />
        </svg>

        <svg className="pdf-card" viewBox="0 0 100 124" aria-hidden="true">
          <path
            className="pdf-paper"
            d="M12 4 H66 L88 26 V112 C88 117 84 121 79 121 H12 C7 121 3 117 3 112 V13 C3 8 7 4 12 4 Z"
          />
          <path className="pdf-fold" d="M66 4 V27 H88 Z" />
          <rect className="pdf-badge" x="20" y="76" width="60" height="26" rx="8" />
          <text x="50" y="94" textAnchor="middle">
            PDF
          </text>
          <line className="pdf-line" x1="21" y1="42" x2="70" y2="42" />
          <line className="pdf-line" x1="21" y1="55" x2="77" y2="55" />
          <line className="pdf-line" x1="21" y1="68" x2="58" y2="68" />
        </svg>
      </div>

      <div className="loader-text">{label}</div>
    </div>
  )
}

function ScannerControls({
  isDragging,
  inputRef,
  imageCount,
  totalSize,
  text,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  isDragging: boolean
  inputRef: RefObject<HTMLInputElement | null>
  imageCount: number
  totalSize: number
  text: UiText
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
          <span>{languageText(text, 'Escaneo automatico', 'Automatic scanning')}</span>
        </div>

        <div className="auto-scan-card">
          <strong>{languageText(text, 'Escaneo inteligente activo', 'Smart scan active')}</strong>
          <p>
            {languageText(
              text,
              'Detecta bordes, recorta, endereza y mejora la iluminacion automaticamente al generar el PDF.',
              'Detects borders, crops, straightens and improves lighting automatically when creating the PDF.',
            )}
          </p>
        </div>
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
  const imageTitle = text.uploadImages
  const imageAction = languageText(text, 'Seleccionar imagenes', 'Select images')

  if (images.length === 0) {
    return (
      <div className="empty-state empty-start">
        <div className="upload-only">
          <UploadMedallion
            inputRef={inputRef}
            accept="image/*"
            multiple
            isDragging={isDragging}
            title={imageTitle}
            action={imageAction}
            formats={['JPG', 'PNG', 'WEBP']}
            onFileChange={onFileChange}
            onDragLeave={onDragLeave}
            onDragOver={(event) => {
              event.preventDefault()
              onDragOver()
            }}
            onDrop={onDrop}
            helperText={text.clickSelect}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-stack">
      <UploadMedallion
        compact
        inputRef={inputRef}
        accept="image/*"
        multiple
        isDragging={isDragging}
        title={imageTitle}
        action={imageAction}
        formats={['JPG', 'PNG', 'WEBP']}
        onFileChange={onFileChange}
        onDragLeave={onDragLeave}
        onDragOver={(event) => {
          event.preventDefault()
          onDragOver()
        }}
        onDrop={onDrop}
        helperText={text.clickSelect}
      />

      <div className="page-list">
        {images.map((image, index) => (
          <article className="page-card" key={image.id}>
            <div className="page-preview">
              <img
                src={image.previewUrl}
                alt={image.name}
                style={{
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
          <UploadMedallion
            inputRef={inputRef}
            accept="application/pdf,.pdf"
            multiple={activeTool === 'merge'}
            isDragging={isDragging}
            title={medallionTitle}
            action={medallionAction}
            formats={['PDF']}
            onFileChange={onFileChange}
            onDragLeave={onDragLeave}
            onDragOver={(event) => {
              event.preventDefault()
              onDragOver()
            }}
            onDrop={onDrop}
            helperText={text.clickSelect}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-stack">
      <UploadMedallion
        compact
        inputRef={inputRef}
        accept="application/pdf,.pdf"
        multiple={activeTool === 'merge'}
        isDragging={isDragging}
        title={medallionTitle}
        action={medallionAction}
        formats={['PDF']}
        onFileChange={onFileChange}
        onDragLeave={onDragLeave}
        onDragOver={(event) => {
          event.preventDefault()
          onDragOver()
        }}
        onDrop={onDrop}
        helperText={text.clickSelect}
      />

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
    </div>
  )
}

function UploadMedallion({
  inputRef,
  accept,
  multiple,
  compact = false,
  isDragging,
  title,
  action,
  helperText,
  formats,
  onFileChange,
  onDragLeave,
  onDragOver,
  onDrop,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  accept: string
  multiple: boolean
  compact?: boolean
  isDragging: boolean
  title: string
  action: string
  helperText: string
  formats: string[]
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDragLeave: () => void
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
}) {
  return (
    <label
      className={`upload-hero ${compact ? 'is-compact' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onFileChange}
      />
      <div className="upload-medallion-wrap">
        <img className="upload-medallion" src="/upload-medallion.png" alt="" aria-hidden="true" />
        <div className="upload-medallion-copy">
          <strong>{title}</strong>
          <span>{action}</span>
        </div>
      </div>
      {!compact && (
        <>
          <span className="upload-caption">{title}</span>
          <small>{helperText}</small>
          <div className="format-pills">
            {formats.map((format) => (
              <span key={format}>{format}</span>
            ))}
          </div>
        </>
      )}
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

async function renderImageToJpeg(image: PageImage) {
  const bitmap = await createImageBitmap(image.file)
  const rotatedCanvas = drawRotatedImage(bitmap, image.rotation)
  const openCvCanvas = await cropDocumentWithOpenCv(rotatedCanvas)
  const scannedCanvas = openCvCanvas ?? cropDocumentPerspective(rotatedCanvas) ?? cropDocument(rotatedCanvas)
  const refinedCanvas = openCvCanvas ? scannedCanvas : cropDocument(straightenDocument(scannedCanvas))
  const tightenedCanvas = cropDocument(refinedCanvas)
  const enhancedCanvas = applySmartScannerEffect(tightenedCanvas)
  const outputCanvas = cropDocument(enhancedCanvas)
  const bytes = await canvasToJpegBytes(outputCanvas)
  bitmap.close()

  return {
    bytes,
    width: outputCanvas.width,
    height: outputCanvas.height,
  }
}

let openCvPromise: Promise<CvRuntime> | null = null

type CvRuntime = {
  Mat: new () => CvMat
  MatVector: new () => CvMatVector
  Size: new (width: number, height: number) => unknown
  Point: new (x: number, y: number) => unknown
  Scalar: new (...values: number[]) => unknown
  CV_32FC2: number
  COLOR_RGBA2GRAY: number
  RETR_EXTERNAL: number
  CHAIN_APPROX_SIMPLE: number
  MORPH_RECT: number
  MORPH_CLOSE: number
  MORPH_OPEN: number
  INTER_LINEAR: number
  BORDER_REPLICATE: number
  THRESH_BINARY: number
  THRESH_OTSU: number
  imread: (source: HTMLCanvasElement) => CvMat
  imshow: (target: HTMLCanvasElement, source: CvMat) => void
  cvtColor: (source: CvMat, target: CvMat, code: number) => void
  GaussianBlur: (
    source: CvMat,
    target: CvMat,
    size: unknown,
    sigmaX: number,
    sigmaY?: number,
    borderType?: number,
  ) => void
  Canny: (source: CvMat, target: CvMat, threshold1: number, threshold2: number) => void
  HoughLinesP?: (
    source: CvMat,
    lines: CvMat,
    rho: number,
    theta: number,
    threshold: number,
    minLineLength: number,
    maxLineGap: number,
  ) => void
  threshold: (source: CvMat, target: CvMat, threshold: number, maxValue: number, type: number) => void
  getStructuringElement: (shape: number, size: unknown) => CvMat
  morphologyEx: (source: CvMat, target: CvMat, operation: number, kernel: CvMat) => void
  findContours: (
    source: CvMat,
    contours: CvMatVector,
    hierarchy: CvMat,
    mode: number,
    method: number,
  ) => void
  contourArea: (contour: CvMat) => number
  arcLength: (curve: CvMat, closed: boolean) => number
  approxPolyDP: (curve: CvMat, approxCurve: CvMat, epsilon: number, closed: boolean) => void
  minAreaRect: (points: CvMat) => CvRotatedRect
  boxPoints: (box: CvRotatedRect) => Point[]
  matFromArray: (rows: number, cols: number, type: number, array: number[]) => CvMat
  getPerspectiveTransform: (source: CvMat, target: CvMat) => CvMat
  warpPerspective: (
    source: CvMat,
    target: CvMat,
    transform: CvMat,
    size: unknown,
    flags?: number,
    borderMode?: number,
    borderValue?: unknown,
  ) => void
}

type CvFactory = (moduleArg?: Record<string, unknown>) => Promise<CvRuntime> | CvRuntime
type CvGlobal = CvRuntime | CvFactory | undefined
type CvModule = { default?: CvGlobal } & Record<string, unknown>

type CvMat = {
  rows: number
  cols: number
  data: Uint8Array
  data32S: Int32Array
  delete: () => void
}

type CvMatVector = {
  size: () => number
  get: (index: number) => CvMat
  delete: () => void
}

type CvRotatedRect = unknown

async function loadOpenCv() {
  if (!openCvPromise) {
    openCvPromise = loadOpenCvScript().catch((error) => {
      openCvPromise = null
      throw error
    })
  }

  return openCvPromise
}

function loadOpenCvScript() {
  return new Promise<CvRuntime>((resolve, reject) => {
    const existingRuntime = getWindowOpenCvRuntime()
    if (existingRuntime) {
      resolve(existingRuntime)
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-sparta-opencv="true"]')
    const script = existingScript ?? document.createElement('script')

    if (!existingScript) {
      script.async = true
      script.dataset.spartaOpencv = 'true'
      script.src = openCvScriptUrl
    }

    const timeout = window.setTimeout(() => {
      reject(new Error('OpenCV no termino de cargar a tiempo.'))
    }, 45000)

    const finish = () => {
      void resolveOpenCvRuntime()
        .then((runtime) => {
          window.clearTimeout(timeout)
          resolve(runtime)
        })
        .catch((error: unknown) => {
          window.clearTimeout(timeout)
          reject(error instanceof Error ? error : new Error('OpenCV no esta disponible.'))
        })
    }

    if (existingScript) {
      if (existingScript.dataset.spartaLoaded === 'true') {
        finish()
      } else {
        existingScript.addEventListener('load', finish, { once: true })
      }
    } else {
      script.addEventListener('load', finish, { once: true })
      script.addEventListener(
        'error',
        () => {
          window.clearTimeout(timeout)
          reject(new Error('No se pudo cargar opencv.js.'))
        },
        { once: true },
      )
      script.addEventListener(
        'load',
        () => {
          script.dataset.spartaLoaded = 'true'
        },
        { once: true },
      )
      document.head.append(script)
    }
  })
}

async function resolveOpenCvRuntime() {
  const runtime = getWindowOpenCvRuntime()
  if (runtime) return runtime

  const cvGlobal = await waitForOpenCvGlobal()
  const runtimeFromGlobal = await normalizeOpenCvValue(cvGlobal)
  if (runtimeFromGlobal) return runtimeFromGlobal

  const importedModule = (await import('@techstark/opencv-js')) as unknown as CvModule
  const runtimeFromImport = await normalizeOpenCvValue(importedModule.default ?? importedModule)
  if (runtimeFromImport) return runtimeFromImport

  throw new Error('OpenCV no esta disponible en window.cv.')
}

async function normalizeOpenCvValue(value: unknown) {
  if (isOpenCvRuntime(value)) return cacheOpenCvRuntime(value)

  if (typeof value === 'function') {
    const initializedRuntime = await (value as CvFactory)()

    if (isOpenCvRuntime(initializedRuntime)) {
      return cacheOpenCvRuntime(initializedRuntime)
    }
  }

  return null
}

function cacheOpenCvRuntime(runtime: CvRuntime) {
  ;(globalThis as unknown as { cv?: CvRuntime }).cv = runtime
  return runtime
}

async function waitForOpenCvGlobal() {
  const startedAt = performance.now()

  while (performance.now() - startedAt < 8000) {
    const cvGlobal = getWindowOpenCvGlobal()
    if (cvGlobal) return cvGlobal

    await new Promise((resolve) => {
      window.setTimeout(resolve, 80)
    })
  }

  return getWindowOpenCvGlobal()
}

function getWindowOpenCvRuntime() {
  const cvGlobal = getWindowOpenCvGlobal()
  return isOpenCvRuntime(cvGlobal) ? cvGlobal : null
}

function getWindowOpenCvGlobal() {
  return (globalThis as unknown as { cv?: CvGlobal }).cv
}

function isOpenCvRuntime(value: unknown): value is CvRuntime {
  return (
    typeof value === 'object' &&
    value !== null &&
    'Mat' in value &&
    typeof (value as CvRuntime).Mat === 'function'
  )
}

async function cropDocumentWithOpenCv(canvas: HTMLCanvasElement) {
  try {
    const cv = await loadOpenCv()
    const maxSide = 1700
    const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height))
    const sample = document.createElement('canvas')
    const sampleContext = sample.getContext('2d')
    if (!sampleContext) return null

    sample.width = Math.max(1, Math.round(canvas.width * scale))
    sample.height = Math.max(1, Math.round(canvas.height * scale))
    sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height)

    const quad = detectDocumentQuadWithOpenCv(cv, sample)
    if (!quad) {
      console.info('[SpartaPDF] OpenCV cargado, pero no encontro un documento claro. Usando fallback.')
      return null
    }

    const unscale = 1 / scale
    const sourceQuad = expandQuad(
      {
        topLeft: scalePoint(quad.topLeft, unscale),
        topRight: scalePoint(quad.topRight, unscale),
        bottomRight: scalePoint(quad.bottomRight, unscale),
        bottomLeft: scalePoint(quad.bottomLeft, unscale),
      },
      canvas.width,
      canvas.height,
      Math.round(Math.min(canvas.width, canvas.height) * 0.006),
    )

    const output = warpQuadWithOpenCv(cv, canvas, sourceQuad)
    if (output) console.info('[SpartaPDF] Documento recortado con OpenCV.')
    return output
  } catch (error) {
    console.warn('[SpartaPDF] OpenCV fallo y se usara el recorte anterior.', error)
    return null
  }
}

function detectDocumentQuadWithOpenCv(cv: CvRuntime, canvas: HTMLCanvasElement) {
  const source = cv.imread(canvas)
  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const edges = new cv.Mat()
  const paperMask = new cv.Mat()
  const smallKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
  const largeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(13, 13))

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.threshold(blurred, paperMask, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
    cv.morphologyEx(paperMask, paperMask, cv.MORPH_OPEN, smallKernel)
    cv.morphologyEx(paperMask, paperMask, cv.MORPH_CLOSE, largeKernel)

    const candidates: Quad[] = []
    const paperQuad = findBestOpenCvQuad(cv, paperMask, canvas.width, canvas.height, paperMask)
    if (paperQuad) candidates.push(paperQuad)

    cv.Canny(blurred, edges, 35, 110)
    cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, largeKernel)

    const lineQuad = findOpenCvQuadByLines(cv, edges, canvas.width, canvas.height)
    if (lineQuad) candidates.push(lineQuad)

    const edgeQuad = findBestOpenCvQuad(cv, edges, canvas.width, canvas.height, paperMask)
    if (edgeQuad) candidates.push(edgeQuad)

    return chooseBestOpenCvQuad(candidates, canvas.width, canvas.height, paperMask)
  } finally {
    source.delete()
    gray.delete()
    blurred.delete()
    edges.delete()
    paperMask.delete()
    smallKernel.delete()
    largeKernel.delete()
  }
}

type OpenCvLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  midpointX: number
  midpointY: number
  length: number
}

function findOpenCvQuadByLines(cv: CvRuntime, edges: CvMat, width: number, height: number) {
  if (!cv.HoughLinesP) return null

  const lines = new cv.Mat()

  try {
    cv.HoughLinesP(
      edges,
      lines,
      1,
      Math.PI / 180,
      Math.max(60, Math.round(Math.min(width, height) * 0.055)),
      Math.max(80, Math.round(Math.min(width, height) * 0.22)),
      Math.max(14, Math.round(Math.min(width, height) * 0.025)),
    )

    const horizontal: OpenCvLine[] = []
    const vertical: OpenCvLine[] = []

    for (let index = 0; index < lines.rows; index += 1) {
      const offset = index * 4
      const x1 = lines.data32S[offset]
      const y1 = lines.data32S[offset + 1]
      const x2 = lines.data32S[offset + 2]
      const y2 = lines.data32S[offset + 3]
      const dx = x2 - x1
      const dy = y2 - y1
      const length = Math.hypot(dx, dy)

      if (length < Math.min(width, height) * 0.2) continue

      const line = {
        x1,
        y1,
        x2,
        y2,
        midpointX: (x1 + x2) / 2,
        midpointY: (y1 + y2) / 2,
        length,
      }

      if (Math.abs(dx) >= Math.abs(dy)) {
        horizontal.push(line)
      } else {
        vertical.push(line)
      }
    }

    const top = chooseBoundaryLine(horizontal, 'top', width, height)
    const bottom = chooseBoundaryLine(horizontal, 'bottom', width, height)
    const left = chooseBoundaryLine(vertical, 'left', width, height)
    const right = chooseBoundaryLine(vertical, 'right', width, height)

    if (!top || !bottom || !left || !right) return null

    const quad = orderQuadPoints([
      intersectLines(top, left),
      intersectLines(top, right),
      intersectLines(bottom, right),
      intersectLines(bottom, left),
    ])

    return isValidOpenCvQuad(quad, width, height) ? quad : null
  } finally {
    lines.delete()
  }
}

function chooseBoundaryLine(
  lines: OpenCvLine[],
  side: 'top' | 'bottom' | 'left' | 'right',
  width: number,
  height: number,
) {
  const filtered = lines.filter((line) => {
    if (side === 'top') return line.midpointY < height * 0.58
    if (side === 'bottom') return line.midpointY > height * 0.42
    if (side === 'left') return line.midpointX < width * 0.58
    return line.midpointX > width * 0.42
  })

  let bestLine: OpenCvLine | null = null
  let bestScore = -Infinity

  for (const line of filtered) {
    const normalizedPosition =
      side === 'top' || side === 'bottom' ? line.midpointY / height : line.midpointX / width
    const boundaryPosition =
      side === 'top' || side === 'left' ? 1 - normalizedPosition : normalizedPosition
    const slopePenalty =
      side === 'top' || side === 'bottom'
        ? Math.abs(line.y2 - line.y1) / Math.max(1, Math.abs(line.x2 - line.x1))
        : Math.abs(line.x2 - line.x1) / Math.max(1, Math.abs(line.y2 - line.y1))
    const edgeScore =
      side === 'top'
        ? height - line.midpointY
        : side === 'bottom'
          ? line.midpointY
          : side === 'left'
            ? width - line.midpointX
            : line.midpointX
    const score = line.length * 0.64 + edgeScore * 0.26 + boundaryPosition * 120 - slopePenalty * 85

    if (score > bestScore) {
      bestScore = score
      bestLine = line
    }
  }

  return bestLine
}

function intersectLines(first: OpenCvLine, second: OpenCvLine) {
  const firstA = first.x1 * first.y2 - first.y1 * first.x2
  const secondA = second.x1 * second.y2 - second.y1 * second.x2
  const denominator =
    (first.x1 - first.x2) * (second.y1 - second.y2) -
    (first.y1 - first.y2) * (second.x1 - second.x2)

  if (Math.abs(denominator) < 0.001) {
    return {
      x: (first.midpointX + second.midpointX) / 2,
      y: (first.midpointY + second.midpointY) / 2,
    }
  }

  return {
    x:
      (firstA * (second.x1 - second.x2) - (first.x1 - first.x2) * secondA) /
      denominator,
    y:
      (firstA * (second.y1 - second.y2) - (first.y1 - first.y2) * secondA) /
      denominator,
  }
}

function chooseBestOpenCvQuad(candidates: Quad[], width: number, height: number, paperMask?: CvMat) {
  let bestQuad: Quad | null = null
  let bestScore = -Infinity

  for (const candidate of candidates) {
    if (!isValidOpenCvQuad(candidate, width, height)) continue

    const score = scoreOpenCvQuad(candidate, width, height, quadArea(candidate), paperMask)
    if (score > bestScore) {
      bestQuad = candidate
      bestScore = score
    }
  }

  return bestQuad
}

function isValidOpenCvQuad(quad: Quad, width: number, height: number) {
  const areaRatio = quadArea(quad) / (width * height)
  const quadWidth = Math.max(distance(quad.topLeft, quad.topRight), distance(quad.bottomLeft, quad.bottomRight))
  const quadHeight = Math.max(distance(quad.topLeft, quad.bottomLeft), distance(quad.topRight, quad.bottomRight))
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  const maxOutside = Math.min(width, height) * 0.18

  return (
    areaRatio >= 0.08 &&
    areaRatio <= 0.97 &&
    quadWidth >= width * 0.22 &&
    quadHeight >= height * 0.22 &&
    points.every(
      (point) =>
        point.x >= -maxOutside &&
        point.x <= width + maxOutside &&
        point.y >= -maxOutside &&
        point.y <= height + maxOutside,
    )
  )
}

function findBestOpenCvQuad(cv: CvRuntime, mask: CvMat, width: number, height: number, paperMask?: CvMat) {
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  try {
    const imageArea = width * height
    let bestQuad: Quad | null = null
    let bestScore = -Infinity

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index)
      const area = cv.contourArea(contour)
      const areaRatio = area / imageArea

      if (areaRatio < 0.08 || areaRatio > 0.965) {
        contour.delete()
        continue
      }

      const perimeter = cv.arcLength(contour, true)
      const candidate = approximateContourToQuad(cv, contour, perimeter)
      contour.delete()

      if (!candidate) continue

      const ordered = orderQuadPoints(candidate)
      const quadWidth = Math.max(distance(ordered.topLeft, ordered.topRight), distance(ordered.bottomLeft, ordered.bottomRight))
      const quadHeight = Math.max(distance(ordered.topLeft, ordered.bottomLeft), distance(ordered.topRight, ordered.bottomRight))

      if (quadWidth < width * 0.22 || quadHeight < height * 0.22) continue

      const score = scoreOpenCvQuad(ordered, width, height, area, paperMask)
      if (score > bestScore) {
        bestQuad = ordered
        bestScore = score
      }
    }

    return bestQuad
  } finally {
    contours.delete()
    hierarchy.delete()
  }
}

function scoreOpenCvQuad(quad: Quad, width: number, height: number, contourArea: number, paperMask?: CvMat) {
  const imageArea = width * height
  const area = quadArea(quad)
  const areaRatio = Math.min(area, contourArea) / imageArea
  const topWidth = distance(quad.topLeft, quad.topRight)
  const bottomWidth = distance(quad.bottomLeft, quad.bottomRight)
  const leftHeight = distance(quad.topLeft, quad.bottomLeft)
  const rightHeight = distance(quad.topRight, quad.bottomRight)
  const averageWidth = (topWidth + bottomWidth) / 2
  const averageHeight = (leftHeight + rightHeight) / 2
  const aspect = averageWidth > averageHeight ? averageWidth / averageHeight : averageHeight / averageWidth
  const parallelBalance =
    1 -
    Math.min(
      1,
      (Math.abs(topWidth - bottomWidth) / Math.max(topWidth, bottomWidth, 1) +
        Math.abs(leftHeight - rightHeight) / Math.max(leftHeight, rightHeight, 1)) /
        2,
    )
  const center = {
    x: (quad.topLeft.x + quad.topRight.x + quad.bottomRight.x + quad.bottomLeft.x) / 4,
    y: (quad.topLeft.y + quad.topRight.y + quad.bottomRight.y + quad.bottomLeft.y) / 4,
  }
  const centerDistance = Math.hypot(center.x - width / 2, center.y - height / 2)
  const centerScore = 1 - Math.min(1, centerDistance / Math.hypot(width / 2, height / 2))
  const aspectScore = aspect > 2.35 ? 0.45 : 1
  const overfillPenalty = areaRatio > 0.9 ? (areaRatio - 0.9) * 10 : 0
  const paperFillScore = paperMask ? estimatePaperFillInsideQuad(paperMask, quad, width, height) : 0.75
  const edgeDistanceScore = scoreQuadEdgeDistance(quad, width, height)

  return (
    areaRatio * 3.1 +
    parallelBalance * 2 +
    centerScore * 1.2 +
    aspectScore +
    paperFillScore * 2.3 +
    edgeDistanceScore * 0.8 -
    overfillPenalty
  )
}

function estimatePaperFillInsideQuad(mask: CvMat, quad: Quad, width: number, height: number) {
  if (!mask.data) return 0.75

  const minX = Math.max(0, Math.floor(Math.min(quad.topLeft.x, quad.topRight.x, quad.bottomRight.x, quad.bottomLeft.x)))
  const maxX = Math.min(width - 1, Math.ceil(Math.max(quad.topLeft.x, quad.topRight.x, quad.bottomRight.x, quad.bottomLeft.x)))
  const minY = Math.max(0, Math.floor(Math.min(quad.topLeft.y, quad.topRight.y, quad.bottomRight.y, quad.bottomLeft.y)))
  const maxY = Math.min(height - 1, Math.ceil(Math.max(quad.topLeft.y, quad.topRight.y, quad.bottomRight.y, quad.bottomLeft.y)))
  const step = Math.max(2, Math.floor(Math.min(width, height) / 90))
  let paperHits = 0
  let samples = 0

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      if (!isPointInsideQuad({ x, y }, quad)) continue
      samples += 1
      if (mask.data[y * width + x] > 0) paperHits += 1
    }
  }

  if (samples === 0) return 0
  return paperHits / samples
}

function scoreQuadEdgeDistance(quad: Quad, width: number, height: number) {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  const minDistance = Math.min(
    ...points.map((point) => Math.min(point.x, width - point.x, point.y, height - point.y)),
  )

  return Math.min(1, Math.max(0, minDistance / Math.max(1, Math.min(width, height) * 0.08)))
}

function isPointInsideQuad(point: Point, quad: Quad) {
  const polygon = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  let inside = false

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const currentPoint = polygon[current]
    const previousPoint = polygon[previous]
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          Math.max(0.001, previousPoint.y - currentPoint.y) +
          currentPoint.x

    if (intersects) inside = !inside
  }

  return inside
}

function quadArea(quad: Quad) {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  let area = 0

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }

  return Math.abs(area) / 2
}

function approximateContourToQuad(cv: CvRuntime, contour: CvMat, perimeter: number) {
  const epsilons = [0.018, 0.024, 0.032, 0.045, 0.06]

  for (const epsilon of epsilons) {
    const approx = new cv.Mat()
    cv.approxPolyDP(contour, approx, perimeter * epsilon, true)

    if (approx.rows === 4 && approx.data32S.length >= 8) {
      const points = matToPoints(approx)
      approx.delete()
      return points
    }

    approx.delete()
  }

  return cv.boxPoints(cv.minAreaRect(contour))
}

function matToPoints(mat: CvMat) {
  const points: Point[] = []

  for (let index = 0; index < mat.rows; index += 1) {
    points.push({
      x: mat.data32S[index * 2],
      y: mat.data32S[index * 2 + 1],
    })
  }

  return points
}

function orderQuadPoints(points: Point[]): Quad {
  let topLeft = points[0]
  let topRight = points[0]
  let bottomRight = points[0]
  let bottomLeft = points[0]

  for (const point of points) {
    if (point.x + point.y < topLeft.x + topLeft.y) topLeft = point
    if (point.x - point.y > topRight.x - topRight.y) topRight = point
    if (point.x + point.y > bottomRight.x + bottomRight.y) bottomRight = point
    if (point.y - point.x > bottomLeft.y - bottomLeft.x) bottomLeft = point
  }

  return { topLeft, topRight, bottomRight, bottomLeft }
}

function warpQuadWithOpenCv(cv: CvRuntime, canvas: HTMLCanvasElement, quad: Quad) {
  const width = Math.max(distance(quad.topLeft, quad.topRight), distance(quad.bottomLeft, quad.bottomRight))
  const height = Math.max(distance(quad.topLeft, quad.bottomLeft), distance(quad.topRight, quad.bottomRight))
  const outputWidth = Math.max(1, Math.round(width))
  const outputHeight = Math.max(1, Math.round(height))

  if (outputWidth < canvas.width * 0.2 || outputHeight < canvas.height * 0.2) return null

  const source = cv.imread(canvas)
  const destination = new cv.Mat()
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    quad.topLeft.x,
    quad.topLeft.y,
    quad.topRight.x,
    quad.topRight.y,
    quad.bottomRight.x,
    quad.bottomRight.y,
    quad.bottomLeft.x,
    quad.bottomLeft.y,
  ])
  const targetPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    outputWidth - 1,
    0,
    outputWidth - 1,
    outputHeight - 1,
    0,
    outputHeight - 1,
  ])
  const transform = cv.getPerspectiveTransform(sourcePoints, targetPoints)
  const output = document.createElement('canvas')

  try {
    cv.warpPerspective(
      source,
      destination,
      transform,
      new cv.Size(outputWidth, outputHeight),
      cv.INTER_LINEAR,
      cv.BORDER_REPLICATE,
      new cv.Scalar(),
    )
    output.width = outputWidth
    output.height = outputHeight
    cv.imshow(output, destination)
    return output
  } finally {
    source.delete()
    destination.delete()
    sourcePoints.delete()
    targetPoints.delete()
    transform.delete()
  }
}

function straightenDocument(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return canvas

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const angle = estimateDocumentSkew(imageData, canvas.width, canvas.height)

  if (Math.abs(angle) < 0.35 || Math.abs(angle) > 7) {
    return canvas
  }

  return rotateCanvasByAngle(canvas, -angle)
}

function drawRotatedImage(bitmap: ImageBitmap, rotation: number) {
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
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)

  return canvas
}

function cropDocumentPerspective(canvas: HTMLCanvasElement) {
  const quad = detectDocumentQuad(canvas)
  if (!quad) return null

  const output = warpQuadToCanvas(canvas, quad)
  if (!output) return null

  if (output.width < canvas.width * 0.24 || output.height < canvas.height * 0.24) {
    return null
  }

  return output
}

type Point = { x: number; y: number }
type Quad = { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }

function detectDocumentQuad(canvas: HTMLCanvasElement) {
  const maxSide = 420
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height))
  const width = Math.max(1, Math.round(canvas.width * scale))
  const height = Math.max(1, Math.round(canvas.height * scale))
  const sample = document.createElement('canvas')
  const context = sample.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  sample.width = width
  sample.height = height
  context.drawImage(canvas, 0, 0, width, height)

  const imageData = context.getImageData(0, 0, width, height)
  const mask = buildPaperMask(imageData, width, height)
  const component = findLargestMaskComponent(mask, width, height)
  if (!component || component.points.length < width * height * 0.08) return null

  const quad = componentToQuad(component.points)
  if (!quad) return null

  const unscale = 1 / scale
  return expandQuad(
    {
      topLeft: scalePoint(quad.topLeft, unscale),
      topRight: scalePoint(quad.topRight, unscale),
      bottomRight: scalePoint(quad.bottomRight, unscale),
      bottomLeft: scalePoint(quad.bottomLeft, unscale),
    },
    canvas.width,
    canvas.height,
    Math.round(Math.min(canvas.width, canvas.height) * 0.004),
  )
}

function buildPaperMask(imageData: ImageData, width: number, height: number) {
  const pixels = imageData.data
  const mask = new Uint8Array(width * height)
  const edgeBrightness = sampleEdgeBrightness(pixels, width, height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      const brightness = (red + green + blue) / 3
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue)
      const redBias = red - (green + blue) / 2
      const likelyPaper =
        (brightness > Math.max(138, edgeBrightness + 22) && saturation < 54 && redBias < 28) ||
        (brightness > 184 && saturation < 72 && redBias < 36) ||
        (brightness > 220 && saturation < 96)

      if (likelyPaper) {
        mask[y * width + x] = 1
      }
    }
  }

  return closeMask(mask, width, height)
}

function sampleEdgeBrightness(pixels: Uint8ClampedArray, width: number, height: number) {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80))
  let sum = 0
  let count = 0

  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      sum += pixelBrightness(pixels, width, x, y)
      count += 1
    }
  }

  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      sum += pixelBrightness(pixels, width, x, y)
      count += 1
    }
  }

  return count > 0 ? sum / count : 128
}

function closeMask(mask: Uint8Array, width: number, height: number) {
  const opened = dilateMask(erodeMask(mask, width, height), width, height)
  return erodeMask(dilateMask(opened, width, height), width, height)
}

function dilateMask(mask: Uint8Array, width: number, height: number) {
  const output = new Uint8Array(mask.length)

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let value = 0

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          value = Math.max(value, mask[(y + dy) * width + x + dx])
        }
      }

      output[y * width + x] = value
    }
  }

  return output
}

function erodeMask(mask: Uint8Array, width: number, height: number) {
  const output = new Uint8Array(mask.length)

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let value = 1

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          value = Math.min(value, mask[(y + dy) * width + x + dx])
        }
      }

      output[y * width + x] = value
    }
  }

  return output
}

function findLargestMaskComponent(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length)
  let best: { points: Point[] } | null = null

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x
      if (!mask[startIndex] || visited[startIndex]) continue

      const points: Point[] = []
      const queue = [startIndex]
      visited[startIndex] = 1

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor]
        const pointX = index % width
        const pointY = Math.floor(index / width)
        points.push({ x: pointX, y: pointY })

        for (const next of [index - 1, index + 1, index - width, index + width]) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
          const nextX = next % width
          if (Math.abs(nextX - pointX) > 1) continue
          visited[next] = 1
          queue.push(next)
        }
      }

      if (!best || points.length > best.points.length) {
        best = { points }
      }
    }
  }

  return best
}

function componentToQuad(points: Point[]) {
  if (points.length === 0) return null

  const topLeft = pickCornerPoint(points, (point) => point.x + point.y, 0.006)
  const topRight = pickCornerPoint(points, (point) => point.x - point.y, 0.994)
  const bottomRight = pickCornerPoint(points, (point) => point.x + point.y, 0.994)
  const bottomLeft = pickCornerPoint(points, (point) => point.y - point.x, 0.994)

  const width = Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight))
  const height = Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight))

  if (width < 40 || height < 40) return null

  return { topLeft, topRight, bottomRight, bottomLeft }
}

function pickCornerPoint(points: Point[], scorePoint: (point: Point) => number, quantile: number) {
  const ranked = points
    .map((point) => ({ point, score: scorePoint(point) }))
    .sort((left, right) => left.score - right.score)
  const index = clampNumber(Math.round((ranked.length - 1) * quantile), 0, ranked.length - 1)
  return ranked[index].point
}

function expandQuad(quad: Quad, width: number, height: number, amount: number) {
  const center = {
    x: (quad.topLeft.x + quad.topRight.x + quad.bottomRight.x + quad.bottomLeft.x) / 4,
    y: (quad.topLeft.y + quad.topRight.y + quad.bottomRight.y + quad.bottomLeft.y) / 4,
  }

  return {
    topLeft: expandPoint(quad.topLeft, center, width, height, amount),
    topRight: expandPoint(quad.topRight, center, width, height, amount),
    bottomRight: expandPoint(quad.bottomRight, center, width, height, amount),
    bottomLeft: expandPoint(quad.bottomLeft, center, width, height, amount),
  }
}

function expandPoint(point: Point, center: Point, width: number, height: number, amount: number) {
  const vectorX = point.x - center.x
  const vectorY = point.y - center.y
  const length = Math.hypot(vectorX, vectorY) || 1

  return {
    x: clampNumber(point.x + (vectorX / length) * amount, 0, width - 1),
    y: clampNumber(point.y + (vectorY / length) * amount, 0, height - 1),
  }
}

function scalePoint(point: Point, scale: number) {
  return {
    x: point.x * scale,
    y: point.y * scale,
  }
}

function warpQuadToCanvas(canvas: HTMLCanvasElement, quad: Quad) {
  const sourceContext = canvas.getContext('2d', { willReadFrequently: true })
  if (!sourceContext) return null

  const width = Math.max(distance(quad.topLeft, quad.topRight), distance(quad.bottomLeft, quad.bottomRight))
  const height = Math.max(distance(quad.topLeft, quad.bottomLeft), distance(quad.topRight, quad.bottomRight))
  const outputWidth = Math.max(1, Math.round(width))
  const outputHeight = Math.max(1, Math.round(height))
  const source = sourceContext.getImageData(0, 0, canvas.width, canvas.height)
  const output = document.createElement('canvas')
  const outputContext = output.getContext('2d')
  if (!outputContext) return null

  output.width = outputWidth
  output.height = outputHeight

  const outputData = outputContext.createImageData(outputWidth, outputHeight)
  const sourcePixels = source.data
  const outputPixels = outputData.data

  for (let y = 0; y < outputHeight; y += 1) {
    const v = outputHeight <= 1 ? 0 : y / (outputHeight - 1)
    const left = interpolatePoint(quad.topLeft, quad.bottomLeft, v)
    const right = interpolatePoint(quad.topRight, quad.bottomRight, v)

    for (let x = 0; x < outputWidth; x += 1) {
      const u = outputWidth <= 1 ? 0 : x / (outputWidth - 1)
      const sourcePoint = interpolatePoint(left, right, u)
      const sourceX = clampNumber(Math.round(sourcePoint.x), 0, canvas.width - 1)
      const sourceY = clampNumber(Math.round(sourcePoint.y), 0, canvas.height - 1)
      const sourceIndex = (sourceY * canvas.width + sourceX) * 4
      const outputIndex = (y * outputWidth + x) * 4

      outputPixels[outputIndex] = sourcePixels[sourceIndex]
      outputPixels[outputIndex + 1] = sourcePixels[sourceIndex + 1]
      outputPixels[outputIndex + 2] = sourcePixels[sourceIndex + 2]
      outputPixels[outputIndex + 3] = 255
    }
  }

  outputContext.putImageData(outputData, 0, 0)
  return output
}

function interpolatePoint(from: Point, to: Point, amount: number) {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
  }
}

function distance(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y)
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
  const edgeBounds = findDocumentBoundsByEdges(imageData, width, height)
  if (edgeBounds) return edgeBounds

  const pixels = imageData.data
  const step = Math.max(2, Math.floor(Math.min(width, height) / 700))
  const borderColor = sampleBorderColor(pixels, width, height, step)
  const rowScores = new Array<number>(height).fill(0)
  const columnScores = new Array<number>(width).fill(0)
  let hits = 0

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      if (isLikelyDocumentArea(pixels, width, x, y, borderColor)) {
        rowScores[y] += 1
        columnScores[x] += 1
        hits += 1
      }
    }
  }

  if (hits < 80) return null

  const minX = firstDenseIndex(columnScores, Math.max(3, Math.floor(height / step / 100)))
  const maxX = lastDenseIndex(columnScores, Math.max(3, Math.floor(height / step / 100)))
  const minY = firstDenseIndex(rowScores, Math.max(3, Math.floor(width / step / 100)))
  const maxY = lastDenseIndex(rowScores, Math.max(3, Math.floor(width / step / 100)))

  if (minX === null || maxX === null || minY === null || maxY === null) return null
  if (minX >= maxX || minY >= maxY) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function findDocumentBoundsByEdges(imageData: ImageData, width: number, height: number) {
  const pixels = imageData.data
  const step = Math.max(2, Math.floor(Math.min(width, height) / 850))
  const verticalScores = new Array<number>(width).fill(0)
  const horizontalScores = new Array<number>(height).fill(0)

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const horizontalGradient = Math.abs(
        pixelBrightness(pixels, width, x + step, y) -
          pixelBrightness(pixels, width, x - step, y),
      )
      const verticalGradient = Math.abs(
        pixelBrightness(pixels, width, x, y + step) -
          pixelBrightness(pixels, width, x, y - step),
      )

      if (horizontalGradient > 18) verticalScores[x] += horizontalGradient
      if (verticalGradient > 18) horizontalScores[y] += verticalGradient
    }
  }

  const left = findBoundaryPeak(verticalScores, 0.02, 0.42)
  const right = findBoundaryPeak(verticalScores, 0.58, 0.98)
  const top = findBoundaryPeak(horizontalScores, 0.02, 0.42)
  const bottom = findBoundaryPeak(horizontalScores, 0.58, 0.98)

  if (left === null || right === null || top === null || bottom === null) return null
  if (right - left < width * 0.26 || bottom - top < height * 0.26) return null
  if (right - left > width * 0.98 && bottom - top > height * 0.98) return null

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

function findBoundaryPeak(scores: number[], fromRatio: number, toRatio: number) {
  const from = Math.max(0, Math.floor(scores.length * fromRatio))
  const to = Math.min(scores.length - 1, Math.ceil(scores.length * toRatio))
  const windowSize = Math.max(8, Math.floor(scores.length * 0.009))
  let bestIndex = -1
  let bestScore = 0
  let total = 0
  let samples = 0

  for (let index = from; index <= to; index += 1) {
    const score = sumWindow(scores, index - Math.floor(windowSize / 2), windowSize)
    total += score
    samples += 1

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  const average = samples > 0 ? total / samples : 0
  if (bestIndex < 0 || bestScore < Math.max(average * 2.2, 900)) return null

  return bestIndex
}

function sampleBorderColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  step: number,
) {
  let red = 0
  let green = 0
  let blue = 0
  let count = 0

  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      const index = (y * width + x) * 4
      red += pixels[index]
      green += pixels[index + 1]
      blue += pixels[index + 2]
      count += 1
    }
  }

  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      const index = (y * width + x) * 4
      red += pixels[index]
      green += pixels[index + 1]
      blue += pixels[index + 2]
      count += 1
    }
  }

  return {
    red: red / count,
    green: green / count,
    blue: blue / count,
  }
}

function isLikelyDocumentArea(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  borderColor: { red: number; green: number; blue: number },
) {
  const index = (y * width + x) * 4
  const red = pixels[index]
  const green = pixels[index + 1]
  const blue = pixels[index + 2]
  const brightness = (red + green + blue) / 3
  const borderDistance =
    Math.abs(red - borderColor.red) +
    Math.abs(green - borderColor.green) +
    Math.abs(blue - borderColor.blue)
  const edgeStrength = localEdgeStrength(pixels, width, x, y)

  return brightness > 118 && (borderDistance > 34 || edgeStrength > 28 || brightness > 205)
}

function localEdgeStrength(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
  const center = pixelBrightness(pixels, width, x, y)
  const right = pixelBrightness(pixels, width, x + 1, y)
  const bottom = pixelBrightness(pixels, width, x, y + 1)

  return Math.abs(center - right) + Math.abs(center - bottom)
}

function pixelBrightness(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4
  return (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
}

function firstDenseIndex(scores: number[], threshold: number) {
  const windowSize = Math.max(12, Math.floor(scores.length * 0.012))

  for (let index = 0; index < scores.length; index += 1) {
    if (sumWindow(scores, index, windowSize) >= threshold) return index
  }

  return null
}

function lastDenseIndex(scores: number[], threshold: number) {
  const windowSize = Math.max(12, Math.floor(scores.length * 0.012))

  for (let index = scores.length - 1; index >= 0; index -= 1) {
    if (sumWindow(scores, index - windowSize, windowSize) >= threshold) return index
  }

  return null
}

function sumWindow(scores: number[], start: number, size: number) {
  let sum = 0
  const from = Math.max(0, start)
  const to = Math.min(scores.length, from + size)

  for (let index = from; index < to; index += 1) {
    sum += scores[index]
  }

  return sum
}

function estimateDocumentSkew(imageData: ImageData, width: number, height: number) {
  const pixels = imageData.data
  const stepX = Math.max(2, Math.floor(width / 220))
  const stepY = Math.max(2, Math.floor(height / 220))
  const topPoints: Array<{ x: number; y: number }> = []
  const bottomPoints: Array<{ x: number; y: number }> = []

  for (let x = 0; x < width; x += stepX) {
    for (let y = 0; y < height; y += stepY) {
      if (isDocumentPixel(pixels, width, x, y)) {
        topPoints.push({ x, y })
        break
      }
    }

    for (let y = height - 1; y >= 0; y -= stepY) {
      if (isDocumentPixel(pixels, width, x, y)) {
        bottomPoints.push({ x, y })
        break
      }
    }
  }

  const topAngle = lineAngle(topPoints)
  const bottomAngle = lineAngle(bottomPoints)
  const angles = [topAngle, bottomAngle].filter((angle): angle is number => angle !== null)

  if (angles.length === 0) return 0

  return angles.reduce((sum, angle) => sum + angle, 0) / angles.length
}

function isDocumentPixel(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4
  const red = pixels[index]
  const green = pixels[index + 1]
  const blue = pixels[index + 2]
  const brightness = (red + green + blue) / 3
  const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue)

  return brightness < 232 || colorSpread > 22
}

function lineAngle(points: Array<{ x: number; y: number }>) {
  if (points.length < 16) return null

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length
  let numerator = 0
  let denominator = 0

  for (const point of points) {
    numerator += (point.x - meanX) * (point.y - meanY)
    denominator += (point.x - meanX) ** 2
  }

  if (denominator === 0) return null

  return Math.atan(numerator / denominator) * (180 / Math.PI)
}

function rotateCanvasByAngle(canvas: HTMLCanvasElement, angle: number) {
  const radians = (angle * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  const width = Math.ceil(canvas.width * cos + canvas.height * sin)
  const height = Math.ceil(canvas.width * sin + canvas.height * cos)
  const output = document.createElement('canvas')
  const context = output.getContext('2d')
  if (!context) return canvas

  output.width = width
  output.height = height
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.translate(width / 2, height / 2)
  context.rotate(radians)
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)

  return output
}

function applySmartScannerEffect(canvas: HTMLCanvasElement) {
  const output = cloneCanvas(canvas)
  const context = output.getContext('2d', { willReadFrequently: true })
  if (!context) return output

  const backgroundCanvas = document.createElement('canvas')
  const backgroundContext = backgroundCanvas.getContext('2d', { willReadFrequently: true })
  if (!backgroundContext) return output

  backgroundCanvas.width = output.width
  backgroundCanvas.height = output.height
  backgroundContext.filter = `blur(${Math.max(18, Math.round(Math.min(output.width, output.height) * 0.035))}px)`
  backgroundContext.drawImage(output, 0, 0)

  const imageData = context.getImageData(0, 0, output.width, output.height)
  const backgroundData = backgroundContext.getImageData(0, 0, output.width, output.height)
  const pixels = imageData.data
  const backgroundPixels = backgroundData.data

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const brightness = (red + green + blue) / 3
    const backgroundBrightness =
      (backgroundPixels[index] + backgroundPixels[index + 1] + backgroundPixels[index + 2]) / 3
    const shadowGain = Math.min(1.22, Math.max(0.96, 218 / Math.max(112, backgroundBrightness)))
    const cleanedRed = smartChannel(red, green, blue, brightness, shadowGain)
    const cleanedGreen = smartChannel(green, red, blue, brightness, shadowGain)
    const cleanedBlue = smartChannel(blue, red, green, brightness, shadowGain)

    pixels[index] = cleanedRed
    pixels[index + 1] = cleanedGreen
    pixels[index + 2] = cleanedBlue
  }

  context.putImageData(imageData, 0, 0)
  return output
}

function smartChannel(
  value: number,
  firstOtherValue: number,
  secondOtherValue: number,
  brightness: number,
  shadowGain: number,
) {
  const colorSpread = Math.max(value, firstOtherValue, secondOtherValue) - Math.min(value, firstOtherValue, secondOtherValue)
  const isInk = brightness < 158 || colorSpread > 70
  const normalized = value * shadowGain + (isInk ? 1 : 4)
  const contrasted = (normalized - 128) * (isInk ? 1.08 : 1.03) + 128
  const cleaned = brightness > 226 && colorSpread < 42 ? Math.max(contrasted, 232) : contrasted

  return clampColor(cleaned)
}

function clampColor(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
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
