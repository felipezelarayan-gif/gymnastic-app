import AlumnoHistorialProfesor from "@/components/alumnos/AlumnoHistorialProfesor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AlumnoHistorialProfesor params={params} />;
}
