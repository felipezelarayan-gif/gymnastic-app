import AlumnoPerfilProfesor from "@/components/alumnos/AlumnoPerfilProfesor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AlumnoPerfilProfesor params={params} />;
}
