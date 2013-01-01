package org.kohsuke.ajaxterm;

import com.sun.jna.ptr.IntByReference;
import static org.kohsuke.ajaxterm.UtilLibrary.LIBUTIL;
import static org.kohsuke.ajaxterm.CLibrary.*;
import static org.kohsuke.ajaxterm.CLibrary.FD_CLOEXEC;

import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletRequest;
import java.io.FileDescriptor;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.lang.reflect.Field;

/**
 * Represents a session.
 *
 * @author Kohsuke Kawaguchi
 */
public final class Session extends Thread {
    /**
     * PID of the child process.
     */
    public final int pid;
    public final Terminal terminal;
    /**
     * When was this session allocated?
     */
    public final long time = System.currentTimeMillis();
    private final Reader in;
    public final Writer out;

    /**
     *
     * @param width
     *      Width of the terminal. For example, 80.
     * @param height
     *      Height of the terminal. For example, 25.
     * @param commands
     *      Command line arguments of the process to launch.
     *      {"/bin/bash","--login"} for example.
     */
    public Session(int width, int height, String... commands) throws Exception {
        if(commands.length==0)
            throw new IllegalArgumentException("No command line arguments");
        this.terminal = new Terminal(width,height);

        // make execv call to force classloading
        // once we fork, the child process cannot load more classes reliably.
        LIBC.execv("-",new String[]{"-","-"});

        IntByReference pty = new IntByReference();
        pid = LIBUTIL.forkpty(pty, null, null, null);
        if(pid==0) {
            // on child process
            LIBC.setsid();
            for( int i=LIBC.getdtablesize()-1; i>=3; i-- ) {
                LIBC.fcntl(i, F_SETFD,LIBC.fcntl(i, F_GETFD,0)|FD_CLOEXEC);
            }

            LIBC.setenv("TERM","linux",1);
            LIBC.execv(commands[0],commands);
        }

        FileDescriptor fd = new FileDescriptor();
        Field f = FileDescriptor.class.getDeclaredField("fd");
        f.setAccessible(true);
        f.set(fd,pty.getValue());
        in = new FileReader(fd);
        out = new FileWriter(fd);

        start(); // start pumping
    }

    public void kill() throws IOException {
        in.close();
        out.close();
        LIBC.kill(pid,15/*SIGTERM*/);
    }

    @Override
    public void run() {
        char[] buf = new char[128];
        int len;

        try {
            while((len= in.read(buf))>=0) {
                terminal.write(new String(buf,0,len));
                String reply = terminal.read();
                if(reply!=null)
                    out.write(reply);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void handleUpdate(HttpServletRequest req, HttpServletResponse rsp) throws IOException, InterruptedException {
        String k = req.getParameter("k");
        if(k!=null) {
            out.write(k);
            out.flush();
        }
        Thread.sleep(20);

        rsp.setContentType("application/xml");
        if(terminal.showCursor) {
            rsp.addHeader("Cursor-X",String.valueOf(terminal.getCx()));
            rsp.addHeader("Cursor-Y",String.valueOf(terminal.getCy()));
            rsp.addHeader("Screen-X",String.valueOf(terminal.width));
            rsp.addHeader("Screen-Y",String.valueOf(terminal.height));
        }
        rsp.getWriter().println(terminal.dumpHtml(req.getParameter("c")!=null));
    }
}
