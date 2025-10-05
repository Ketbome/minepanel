# Servers Directory

Esta carpeta contiene todos los servidores de Minecraft que gestionas. Cada servidor tiene su propia carpeta con su configuración y datos.

## Estructura de un servidor

Cada carpeta de servidor contiene:

- `docker-compose.yml` - Configuración del contenedor Docker
- `mc-data/` - Datos del servidor (mundos, plugins, configuraciones, etc.)

## 📦 Agregando Plugins

Cuando agregues plugins mediante **Filebrowser**, es **necesario ajustar los permisos** para que el servidor de Minecraft pueda leer y ejecutar los archivos correctamente.

### Permisos requeridos

Después de subir un plugin a través de Filebrowser, ejecuta los siguientes comandos:

#### En Linux/macOS:

```bash
# Cambiar el propietario de la carpeta plugins
sudo chown -R 1000:1000 mc-data/plugins/

# Establecer permisos de directorio
sudo chmod -R 755 mc-data/plugins/

# Establecer permisos específicos para archivos .jar
sudo find mc-data/plugins/ -type f -name "*.jar" -exec chmod 644 {} \;
```

#### En Windows (PowerShell como Administrador):

```powershell
# Navegar a la carpeta del servidor
cd servers\nombre-del-servidor

# Nota: En Windows con Docker Desktop, los permisos generalmente se manejan automáticamente
# Si tienes problemas, puedes reiniciar el contenedor del servidor
docker-compose restart
```

### ¿Por qué estos permisos?

- **`chown 1000:1000`**: El usuario dentro del contenedor Docker de Minecraft tiene UID/GID 1000
- **`chmod 755`**: Permite al servidor leer y ejecutar los archivos en el directorio
- **`chmod 644 para .jar`**: Los archivos JAR solo necesitan permisos de lectura

### Proceso completo para agregar un plugin:

1. **Accede a Filebrowser**: `http://localhost:25580`
2. **Navega** a la carpeta de tu servidor → `mc-data/plugins/`
3. **Sube** el archivo `.jar` del plugin
4. **Abre una terminal** en el directorio del servidor
5. **Ejecuta los comandos** de permisos mencionados arriba
6. **Reinicia** el servidor para que cargue el plugin:
   ```bash
   docker-compose restart
   ```

### Verificar que el plugin fue cargado:

Puedes revisar los logs del servidor para confirmar:

```bash
# Desde la raíz del proyecto
./logs.sh nombre-del-servidor

# O en Windows
.\logs.ps1 nombre-del-servidor
```

Busca mensajes como:

```
[Server thread/INFO]: [PluginName] Enabling PluginName vX.X.X
```

## ⚠️ Notas importantes

- **No olvides** ejecutar los comandos de permisos después de subir archivos mediante Filebrowser
- Si el plugin no carga, verifica los logs del servidor
- Asegúrate de que el plugin sea compatible con tu versión de Minecraft
- Algunos plugins requieren configuración adicional en `mc-data/plugins/NombrePlugin/config.yml`

## 🔧 Solución de problemas

### El plugin no carga:

1. Verifica que los permisos estén correctos
2. Revisa los logs del servidor
3. Confirma la compatibilidad del plugin con tu versión de Minecraft
4. Asegúrate de que el archivo `.jar` no esté corrupto

### Errores de permisos:

```bash
# Volver a aplicar permisos
sudo chown -R 1000:1000 mc-data/plugins/
sudo chmod -R 755 mc-data/plugins/
sudo find mc-data/plugins/ -type f -name "*.jar" -exec chmod 644 {} \;

# Reiniciar el servidor
docker-compose restart
```

---

Para más información sobre la gestión de servidores, consulta el [README principal](../Readme.md).
