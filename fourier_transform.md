# Fourier Transform — formulas + code, ready to paste

## 1. Continuous Fourier Transform (the math definition)

Forward (time -> frequency):

    X(f) = integral from -infinity to +infinity of x(t) * e^(-j*2*pi*f*t) dt

Inverse (frequency -> time):

    x(t) = integral from -infinity to +infinity of X(f) * e^(+j*2*pi*f*t) df

In LaTeX:

    X(f) = \int_{-\infty}^{\infty} x(t)\, e^{-j 2\pi f t}\, dt
    x(t) = \int_{-\infty}^{\infty} X(f)\, e^{+j 2\pi f t}\, df


## 2. Discrete Fourier Transform (what computers actually run)

Given N samples x[0], x[1], ..., x[N-1]:

    X[k] = sum from n=0 to N-1 of x[n] * e^(-j*2*pi*k*n / N)

    where k = 0, 1, ..., N-1

    x[n] = (1/N) * sum from k=0 to N-1 of X[k] * e^(+j*2*pi*k*n / N)

In LaTeX:

    X[k] = \sum_{n=0}^{N-1} x[n]\, e^{-j 2\pi k n / N}

The frequency for bin k (in Hz) is:

    f_k = k * sample_rate / N


## 3. FFT — the fast algorithm

The FFT is just a clever O(N log N) algorithm that computes the DFT above.
It produces identical output, just much faster. You don't have to implement
it -- every language has it built in.


## 4. Python (NumPy) — drop into any agent / script

    import numpy as np

    # x = your audio samples (1-D array of floats)
    # fs = sample rate in Hz

    N = len(x)
    X = np.fft.rfft(x)               # complex spectrum, length N//2 + 1
    freqs = np.fft.rfftfreq(N, 1/fs) # frequency in Hz for each bin
    mag = np.abs(X)                  # magnitude spectrum

    peak_bin = np.argmax(mag)
    peak_freq = freqs[peak_bin]      # dominant frequency in Hz
    bpm = 60 * peak_freq             # if peak_freq is a heart rate


## 5. Plain-English version for an LLM system prompt

Use this if you're pasting into a Claude/agent prompt:

    The Fourier transform takes a time-domain signal x(t) and decomposes
    it into the sum of sinusoids that make it up. The output X(f) tells
    you how much of each frequency f is present in x(t).

    For sampled audio with N samples at sample rate fs, the discrete
    version (DFT) is:

        X[k] = sum over n of x[n] * exp(-j * 2*pi * k * n / N)

    Bin k corresponds to frequency f_k = k * fs / N hertz. The magnitude
    |X[k]| says how strong that frequency is. To find the dominant
    frequency, take argmax of |X[k]| over the bins of interest.

    For a heart rate signal, the dominant frequency f_peak (in Hz) maps
    to beats per minute as: BPM = 60 * f_peak.
