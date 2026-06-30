import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode, RefObject } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eraser,
  FileImage,
  Files,
  HelpCircle,
  ImagePlus,
  Layers,
  Lock,
  Mail,
  MoreVertical,
  RefreshCw,
  RotateCw,
  ScanLine,
  Scissors,
  ShieldCheck,
  Stamp,
  Trash2,
  X,
} from 'lucide-react'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import './App.css'

type Tool = 'scanner' | 'merge' | 'split' | 'rotate' | 'delete' | 'watermark'
type InfoPanel = 'about' | 'contact' | 'privacy' | 'help'

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

const tools: Array<{
  id: Tool
  label: string
  icon: typeof FileImage
  description: string
}> = [
  {
    id: 'scanner',
    label: 'Imagen a PDF',
    icon: FileImage,
    description: 'Escanea imagenes, recorta bordes y genera PDF A4.',
  },
  {
    id: 'merge',
    label: 'Unir PDFs',
    icon: Layers,
    description: 'Combina varios PDFs en un solo archivo.',
  },
  {
    id: 'split',
    label: 'Dividir PDF',
    icon: Scissors,
    description: 'Extrae paginas o rangos concretos.',
  },
  {
    id: 'rotate',
    label: 'Rotar PDF',
    icon: RotateCw,
    description: 'Gira todas las paginas de un PDF.',
  },
  {
    id: 'delete',
    label: 'Eliminar paginas',
    icon: Eraser,
    description: 'Quita paginas o rangos de un PDF.',
  },
  {
    id: 'watermark',
    label: 'Marca de agua',
    icon: Stamp,
    description: 'Anade texto suave a todas las paginas.',
  },
]

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('scanner')
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

  const activeToolMeta = tools.find((tool) => tool.id === activeTool) ?? tools[0]
  const isEmptyStart =
    (activeTool === 'scanner' && images.length === 0) ||
    (activeTool !== 'scanner' && pdfFiles.length === 0)

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
    setStatus('Leyendo PDFs...')

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
        setStatus(`No se pudo leer ${file.name}`)
      }
    }

    setPdfFiles((current) => [...current, ...nextFiles])
    setStatus(nextFiles.length > 0 ? 'PDFs cargados.' : 'No se cargaron PDFs validos.')
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
    await runExport('Generando PDF desde imagenes...', async () => {
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
    await runExport('Uniendo PDFs...', async () => {
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
    await runExport('Extrayendo paginas...', async () => {
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
    await runExport('Rotando PDF...', async () => {
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
    await runExport('Eliminando paginas...', async () => {
      const source = await PDFDocument.load(await file.file.arrayBuffer(), {
        ignoreEncryption: true,
      })
      const selectedPages = new Set(parsePageSelection(pageSelection, source.getPageCount()))
      const pagesToKeep = source.getPageIndices().filter((index) => !selectedPages.has(index))

      if (pagesToKeep.length === 0) {
        throw new Error('No puedes eliminar todas las paginas.')
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
    await runExport('Anadiendo marca de agua...', async () => {
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
      setStatus('Archivo generado correctamente.')
    } catch (error) {
      await waitForMinimumDuration(startedAt, 1600)
      setStatus(error instanceof Error ? error.message : 'No se pudo generar el archivo.')
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
          {isExporting ? 'Generando...' : 'Descargar PDF'}
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
        {isExporting ? 'Procesando...' : 'Generar PDF'}
      </button>
    )
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="site-navbar">
          <div className="site-brand">
            <img className="site-logo-image" src="/hermes-logo.png" alt="HermesPDF" />
          </div>

          <div className="site-menu">
            <button
              className="menu-button"
              type="button"
              aria-label="Abrir menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <MoreVertical size={22} />
            </button>
            {isMenuOpen && (
              <div className="menu-popover">
                <button type="button" onClick={() => openInfoPanel('about')}>
                  Quienes somos
                </button>
                <button type="button" onClick={() => openInfoPanel('contact')}>
                  Contacto
                </button>
                <button type="button" onClick={() => openInfoPanel('privacy')}>
                  Privacidad
                </button>
                <button type="button" onClick={() => openInfoPanel('help')}>
                  Ayuda
                </button>
              </div>
            )}
          </div>
        </header>

        <header className="topbar">
          <div>
            <p className="eyebrow">Herramienta activa</p>
            <h1>{activeToolMeta.label}</h1>
          </div>
          <div className="topbar-actions">
            <div className="privacy-pill">
              <ShieldCheck size={16} />
              Local y privado
            </div>
            <button className="icon-button" type="button" onClick={resetAll} title="Reiniciar">
              <RefreshCw size={19} />
            </button>
            {renderToolAction()}
          </div>
        </header>

        <nav className="tool-tabs" aria-label="Herramientas PDF">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                className={tool.id === activeTool ? 'is-active' : ''}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id)
                  setStatus('')
                }}
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
              />
            )}
            {status && <p className="status-line">{status}</p>}
          </aside>

          <section className="pages-area" aria-label="Area de trabajo">
            {isExporting && <ScanOverlay message={status || 'Procesando archivo...'} />}
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
                onSelectTool={setActiveTool}
              />
            ) : (
              <PdfWorkspace
                activeTool={activeTool}
                files={pdfFiles}
                inputRef={pdfInputRef}
                isDragging={isDragging}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={() => setIsDragging(true)}
                onDrop={handlePdfDrop}
                onFileChange={handlePdfChange}
                onMove={movePdf}
                onRemove={(id) =>
                  setPdfFiles((current) => current.filter((file) => file.id !== id))
                }
                onSelectTool={setActiveTool}
              />
            )}
          </section>
        </section>

        <TrustAndHowItWorks onOpenPrivacy={() => openInfoPanel('privacy')} />
      </section>

      {infoPanel && <InfoModal panel={infoPanel} onClose={() => setInfoPanel(null)} />}
    </main>
  )

  function openInfoPanel(panel: InfoPanel) {
    setInfoPanel(panel)
    setIsMenuOpen(false)
  }
}

function TrustAndHowItWorks({ onOpenPrivacy }: { onOpenPrivacy: () => void }) {
  return (
    <section className="info-sections" aria-label="Informacion de HermesPDF">
      <div className="info-band">
        <div>
          <p className="hero-kicker">Privacidad primero</p>
          <h2>Tus archivos se quedan en tu navegador</h2>
          <p>
            HermesPDF procesa imagenes y PDFs en local. No necesitas crear cuenta ni subir
            documentos a un servidor para usar estas herramientas.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onOpenPrivacy}>
          <Lock size={18} />
          Ver privacidad
        </button>
      </div>

      <div className="how-grid">
        <InfoStep number="1" title="Sube tus archivos">
          Arrastra imagenes o PDFs a la zona de subida de la herramienta que necesites.
        </InfoStep>
        <InfoStep number="2" title="Ajusta el resultado">
          Ordena paginas, gira, recorta automaticamente o elige rangos segun el caso.
        </InfoStep>
        <InfoStep number="3" title="Descarga al instante">
          Genera el archivo final y descargalo directamente desde tu dispositivo.
        </InfoStep>
      </div>

      <section className="seo-panel" aria-labelledby="seo-title">
        <div className="seo-intro">
          <p className="hero-kicker">Herramientas PDF gratis</p>
          <h2 id="seo-title">Convertir, unir y editar PDF online</h2>
          <p>
            Usa HermesPDF para trabajar con documentos PDF desde el navegador:
            convierte imagenes a PDF, une archivos, divide documentos, rota paginas,
            elimina hojas y anade marcas de agua sin instalar programas.
          </p>
        </div>

        <div className="seo-grid">
          <SeoTopic title="Convertir imagenes a PDF">
            Crea un PDF a partir de imagenes JPG, PNG o WEBP con recorte automatico,
            ajuste de contraste y modo escaneado.
          </SeoTopic>
          <SeoTopic title="Unir PDF gratis">
            Combina varios archivos PDF en un unico documento manteniendo el orden que
            elijas antes de descargarlo.
          </SeoTopic>
          <SeoTopic title="Dividir PDF online">
            Extrae paginas concretas o rangos como 1, 3 o 5-8 para crear un nuevo PDF
            solo con lo que necesitas.
          </SeoTopic>
          <SeoTopic title="Rotar y eliminar paginas PDF">
            Gira paginas completas, elimina hojas innecesarias y deja el documento listo
            para compartir o archivar.
          </SeoTopic>
          <SeoTopic title="Marca de agua PDF">
            Anade una marca de agua de texto a todas las paginas de un PDF para proteger
            borradores, informes o documentos internos.
          </SeoTopic>
          <SeoTopic title="PDF privado sin subir archivos">
            Las operaciones se realizan en tu dispositivo, una ventaja importante si
            trabajas con documentos personales o profesionales.
          </SeoTopic>
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

function InfoModal({ panel, onClose }: { panel: InfoPanel; onClose: () => void }) {
  const content = {
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
  } satisfies Record<InfoPanel, { icon: ReactNode; title: string; body: string[] }>
  const item = content[panel]

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="info-title">
      <article className="info-modal">
        <header>
          <div className="modal-title">
            <span>{item.icon}</span>
            <h2 id="info-title">{item.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
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

function ScanOverlay({ message }: { message: string }) {
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
        <span>Preparando tu PDF localmente</span>
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
        <span>Subir imagenes</span>
        <small>JPG, PNG o WebP. El recorte y el PDF se hacen en tu navegador.</small>
      </label>

      <div className="control-group">
        <div className="control-heading">
          <FileImage size={18} />
          <span>Ajustes de escaner</span>
        </div>

        <Toggle
          label="Recorte automatico"
          checked={adjustments.autoCrop}
          onChange={(autoCrop) => onChange({ ...adjustments, autoCrop })}
        />
        <Toggle
          label="Modo documento"
          checked={adjustments.scanMode}
          onChange={(scanMode) => onChange({ ...adjustments, scanMode })}
        />
        <Toggle
          label="Blanco y negro"
          checked={adjustments.grayscale}
          onChange={(grayscale) => onChange({ ...adjustments, grayscale })}
        />
        <Slider
          label="Brillo"
          value={adjustments.brightness}
          min={70}
          max={160}
          suffix="%"
          onChange={(brightness) => onChange({ ...adjustments, brightness })}
        />
        <Slider
          label="Contraste"
          value={adjustments.contrast}
          min={80}
          max={190}
          suffix="%"
          onChange={(contrast) => onChange({ ...adjustments, contrast })}
        />
        <Slider
          label="Margen PDF"
          value={adjustments.margin}
          min={0}
          max={64}
          suffix="pt"
          onChange={(margin) => onChange({ ...adjustments, margin })}
        />
      </div>

      <div className="stats-strip">
        <span>{imageCount} paginas</span>
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
        <span>Subir PDF{multiple ? 's' : ''}</span>
        <small>
          {multiple
            ? 'El orden de la lista sera el orden del PDF final.'
            : 'Usaremos el primer PDF cargado para esta herramienta.'}
        </small>
      </label>

      <div className="control-group">
        <div className="control-heading">
          <Files size={18} />
          <span>Ajustes</span>
        </div>

        {(activeTool === 'split' || activeTool === 'delete') && (
          <label className="text-row">
            <span>
              {activeTool === 'split' ? 'Paginas a extraer' : 'Paginas a eliminar'}
            </span>
            <input
              type="text"
              value={pageSelection}
              placeholder="1,3,5-8"
              onChange={(event) => onPageSelectionChange(event.target.value)}
            />
            <small>
              {firstFile ? `Este PDF tiene ${firstFile.pages} paginas.` : 'Ejemplo: 1,3,5-8'}
            </small>
          </label>
        )}

        {activeTool === 'rotate' && (
          <label className="select-row">
            <span>Rotacion</span>
            <select value={rotation} onChange={(event) => onRotationChange(Number(event.target.value))}>
              <option value={90}>90 grados</option>
              <option value={180}>180 grados</option>
              <option value={270}>270 grados</option>
            </select>
          </label>
        )}

        {activeTool === 'watermark' && (
          <label className="text-row">
            <span>Texto de marca</span>
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
        <span>{files.length} PDF{files.length === 1 ? '' : 's'}</span>
        <span>{files.reduce((total, file) => total + file.pages, 0)} paginas</span>
      </div>
    </>
  )
}

function ScannerWorkspace({
  images,
  adjustments,
  inputRef,
  isDragging,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onMove,
  onRemove,
  onRotate,
  onSelectTool,
}: {
  images: PageImage[]
  adjustments: Adjustments
  inputRef: RefObject<HTMLInputElement | null>
  isDragging: boolean
  onDragLeave: () => void
  onDragOver: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
  onRotate: (id: string) => void
  onSelectTool: (tool: Tool) => void
}) {
  if (images.length === 0) {
    return (
      <div className="empty-state empty-start">
        <div className="hero-start">
          <div className="hero-copy">
            <p className="hero-kicker">Rapido. Simple. Poderoso.</p>
            <h2>
              Convierte imagenes en <span>PDF</span> en segundos
            </h2>
            <p>
              Crea documentos PDF profesionales desde tus imagenes, con recorte
              automatico y procesamiento privado en tu navegador.
            </p>
            <div className="benefit-list">
              <Benefit icon={<ScanLine size={16} />} title="Escaneo inteligente">
                Detecta bordes y mejora el resultado antes de generar el PDF.
              </Benefit>
              <Benefit icon={<ShieldCheck size={16} />} title="100% local">
                Tus archivos no se suben a ningun servidor.
              </Benefit>
              <Benefit icon={<FileImage size={16} />} title="Gratis y sin limites">
                Sin registros, sin marcas de agua obligatorias.
              </Benefit>
            </div>
          </div>

          <div className="hero-upload-column">
            <label
              className={`upload-hero ${isDragging ? 'is-dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                onDragOver()
              }}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input type="file" accept="image/*" multiple onChange={onFileChange} />
              <ImagePlus size={44} />
              <span>Arrastra tus imagenes aqui</span>
              <small>o haz clic para seleccionar</small>
              <div className="format-pills">
                <span>JPG</span>
                <span>PNG</span>
                <span>WEBP</span>
              </div>
            </label>
            <button className="text-button" type="button" onClick={() => inputRef.current?.click()}>
              Elegir desde el explorador
            </button>
          </div>
        </div>

        <QuickToolCards onSelectTool={onSelectTool} />
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
              <span className="page-number">Pagina {index + 1}</span>
              <strong>{image.name}</strong>
            </div>
            <div className="page-actions">
              <IconAction
                label="Subir pagina"
                disabled={index === 0}
                onClick={() => onMove(image.id, -1)}
                icon={<ArrowUp size={17} />}
              />
              <IconAction
                label="Bajar pagina"
                disabled={index === images.length - 1}
                onClick={() => onMove(image.id, 1)}
                icon={<ArrowDown size={17} />}
              />
              <IconAction
                label="Girar"
                onClick={() => onRotate(image.id)}
                icon={<RotateCw size={17} />}
              />
              <IconAction
                label="Eliminar"
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
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onMove,
  onRemove,
  onSelectTool,
}: {
  activeTool: Tool
  files: PdfFile[]
  inputRef: RefObject<HTMLInputElement | null>
  isDragging: boolean
  onDragLeave: () => void
  onDragOver: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
  onSelectTool: (tool: Tool) => void
}) {
  const tool = tools.find((item) => item.id === activeTool) ?? tools[1]
  const ToolIcon = tool.icon

  if (files.length === 0) {
    return (
      <div className="empty-state empty-start">
        <div className="hero-start">
          <div className="hero-copy">
            <p className="hero-kicker">Herramienta PDF local</p>
            <h2>
              {tool.label} <span>sin subir archivos</span>
            </h2>
            <p>{tool.description} Todo se ejecuta directamente en tu navegador.</p>
            <div className="benefit-list">
              <Benefit icon={<ShieldCheck size={16} />} title="Privado">
                El PDF se procesa en tu dispositivo.
              </Benefit>
              <Benefit icon={<Files size={16} />} title="Rapido">
                Sin colas, sin servidor y sin esperas innecesarias.
              </Benefit>
            </div>
          </div>

          <div className="hero-upload-column">
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
                type="file"
                accept="application/pdf,.pdf"
                multiple={activeTool === 'merge'}
                onChange={onFileChange}
              />
              <ToolIcon size={44} />
              <span>Arrastra tu PDF aqui</span>
              <small>o haz clic para seleccionar</small>
              <div className="format-pills">
                <span>PDF</span>
              </div>
            </label>
            <button className="text-button" type="button" onClick={() => inputRef.current?.click()}>
              Elegir desde el explorador
            </button>
          </div>
        </div>

        <QuickToolCards onSelectTool={onSelectTool} />
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
              {file.pages} paginas - {formatBytes(file.size)}
            </span>
          </div>
          <div className="page-actions">
            <IconAction
              label="Subir PDF"
              disabled={index === 0}
              onClick={() => onMove(file.id, -1)}
              icon={<ArrowUp size={17} />}
            />
            <IconAction
              label="Bajar PDF"
              disabled={index === files.length - 1}
              onClick={() => onMove(file.id, 1)}
              icon={<ArrowDown size={17} />}
            />
            <IconAction
              label="Quitar PDF"
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

function Benefit({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="benefit-item">
      <span className="benefit-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}

function QuickToolCards({ onSelectTool }: { onSelectTool: (tool: Tool) => void }) {
  return (
    <div className="quick-tools">
      {tools.map((tool) => {
        const Icon = tool.icon
        return (
          <button key={tool.id} type="button" onClick={() => onSelectTool(tool.id)}>
            <Icon size={26} />
            <strong>{tool.label}</strong>
            <span>{tool.description}</span>
          </button>
        )
      })}
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

export default App
